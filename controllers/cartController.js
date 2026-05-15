const pool = require('../db/connection');

const getCart = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ci.id, ci.quantity, p.id AS product_id, p.title, p.price, p.image_url,
             p.stock, p.is_sold, p.condition, u.username AS seller_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN users u ON p.seller_id = u.id
      WHERE ci.user_id = $1
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cart.' });
  }
};

const addToCart = async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ message: 'product_id required.' });
  try {
    const p = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Product not found.' });
    if (p.rows[0].is_sold) return res.status(400).json({ message: 'This item is already sold.' });
    if (p.rows[0].seller_id === req.user.id) return res.status(400).json({ message: "You can't buy your own listing." });
    const result = await pool.query(`
      INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3)
      ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3
      RETURNING *
    `, [req.user.id, product_id, quantity]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add to cart.' });
  }
};

const updateCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ message: 'Quantity must be >= 1.' });
  try {
    const result = await pool.query(
      'UPDATE cart_items SET quantity=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [quantity, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cart item not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update cart.' });
  }
};

const removeFromCart = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [id, req.user.id]);
    res.json({ message: 'Item removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove item.' });
  }
};

const clearCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Cart cleared.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear cart.' });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };