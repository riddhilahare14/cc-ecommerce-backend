const pool = require('../db/connection');

const getSaved = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT si.id, si.saved_at, p.id AS product_id, p.title, p.price,
             p.image_url, p.condition, p.is_sold, u.username AS seller_name
      FROM saved_items si
      JOIN products p ON si.product_id = p.id
      JOIN users u ON p.seller_id = u.id
      WHERE si.user_id = $1 ORDER BY si.saved_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved items.' });
  }
};

const toggleSaved = async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ message: 'product_id required.' });
  try {
    const existing = await pool.query(
      'SELECT id FROM saved_items WHERE user_id=$1 AND product_id=$2',
      [req.user.id, product_id]
    );
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM saved_items WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]);
      return res.json({ saved: false });
    }
    await pool.query('INSERT INTO saved_items (user_id, product_id) VALUES ($1,$2)', [req.user.id, product_id]);
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle saved.' });
  }
};

module.exports = { getSaved, toggleSaved };