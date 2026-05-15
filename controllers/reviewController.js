const pool = require('../db/connection');

const getReviews = async (req, res) => {
  const { product_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT r.*, u.username AS reviewer_name, u.university AS reviewer_university
      FROM reviews r JOIN users u ON r.reviewer_id = u.id
      WHERE r.product_id = $1 ORDER BY r.created_at DESC
    `, [product_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
};

const addReview = async (req, res) => {
  const { product_id } = req.params;
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  try {
    const result = await pool.query(`
      INSERT INTO reviews (reviewer_id, product_id, rating, comment)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (reviewer_id, product_id) DO UPDATE SET rating=$3, comment=$4
      RETURNING *
    `, [req.user.id, product_id, rating, comment || '']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add review.' });
  }
};

module.exports = { getReviews, addReview };