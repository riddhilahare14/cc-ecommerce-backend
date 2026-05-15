const pool = require('../db/connection');

const placeOrder = async (req, res) => {
  const { delivery_method, meetup_location } = req.body;
  const buyerId = req.user.id;
  try {
    const cartResult = await pool.query(`
      SELECT ci.quantity, p.id AS product_id, p.price, p.stock, p.title, p.is_sold, p.seller_id
      FROM cart_items ci JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [buyerId]);

    if (cartResult.rows.length === 0) return res.status(400).json({ message: 'Cart is empty.' });

    for (const item of cartResult.rows) {
      if (item.is_sold) return res.status(400).json({ message: `"${item.title}" is already sold.` });
      if (item.stock < item.quantity) return res.status(400).json({ message: `Not enough stock for "${item.title}".` });
    }

    const total = cartResult.rows.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const orderResult = await pool.query(
      'INSERT INTO orders (buyer_id, total, delivery_method, meetup_location) VALUES ($1,$2,$3,$4) RETURNING *',
      [buyerId, total.toFixed(2), delivery_method || 'meetup', meetup_location || '']
    );
    const order = orderResult.rows[0];

    for (const item of cartResult.rows) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, seller_id, quantity, price_at_purchase) VALUES ($1,$2,$3,$4,$5)',
        [order.id, item.product_id, item.seller_id, item.quantity, item.price]
      );
      const newStock = item.stock - item.quantity;
      await pool.query(
        'UPDATE products SET stock=$1, is_sold=$2 WHERE id=$3',
        [newStock, newStock <= 0, item.product_id]
      );
    }

    await pool.query('DELETE FROM cart_items WHERE user_id=$1', [buyerId]);
    res.status(201).json({ message: 'Order placed!', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to place order.' });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await pool.query(
      'SELECT * FROM orders WHERE buyer_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    const result = await Promise.all(orders.rows.map(async (order) => {
      const items = await pool.query(`
        SELECT oi.*, p.title, p.image_url, u.username AS seller_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN users u ON oi.seller_id = u.id
        WHERE oi.order_id = $1
      `, [order.id]);
      return { ...order, items: items.rows };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};

module.exports = { placeOrder, getOrders };