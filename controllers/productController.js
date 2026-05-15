const pool = require('../db/connection');

const getProducts = async (req, res) => {
  const { category_id, search, condition, min_price, max_price } = req.query;
  try {
    let query = `
      SELECT p.*, u.username AS seller_name, u.university AS seller_university,
             c.name AS category_name, c.icon AS category_icon,
             COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) AS avg_rating,
             COUNT(DISTINCT r.id) AS review_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.is_sold = false
    `;
    const params = [];
    if (category_id) { params.push(category_id); query += ` AND p.category_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`; }
    if (condition) { params.push(condition); query += ` AND p.condition = $${params.length}`; }
    if (min_price) { params.push(min_price); query += ` AND p.price >= $${params.length}`; }
    if (max_price) { params.push(max_price); query += ` AND p.price <= $${params.length}`; }
    query += ' GROUP BY p.id, u.username, u.university, c.name, c.icon ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch products.' });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT p.*, u.username AS seller_name, u.university AS seller_university, u.bio AS seller_bio,
             c.name AS category_name, c.icon AS category_icon,
             COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) AS avg_rating,
             COUNT(DISTINCT r.id) AS review_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u.username, u.university, u.bio, c.name, c.icon
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product.' });
  }
};

const getMyListings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name AS category_name, c.icon AS category_icon
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = $1 ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your listings.' });
  }
};

const createProduct = async (req, res) => {
  const { title, description, price, category_id, condition, stock, image_url, is_negotiable } = req.body;
  if (!title || !price) return res.status(400).json({ message: 'Title and price are required.' });
  try {
    const result = await pool.query(`
      INSERT INTO products (seller_id, category_id, title, description, price, condition, stock, image_url, is_negotiable)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [req.user.id, category_id || null, title, description || '', price, condition || 'good', stock || 1, image_url || '', is_negotiable || false]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create listing.' });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, category_id, condition, stock, image_url, is_negotiable, is_sold } = req.body;
  try {
    const check = await pool.query('SELECT * FROM products WHERE id = $1 AND seller_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Listing not found or not yours.' });
    const result = await pool.query(`
      UPDATE products SET title=$1, description=$2, price=$3, category_id=$4,
        condition=$5, stock=$6, image_url=$7, is_negotiable=$8, is_sold=$9
      WHERE id=$10 RETURNING *
    `, [title, description, price, category_id, condition, stock, image_url, is_negotiable, is_sold ?? false, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update listing.' });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM products WHERE id = $1 AND seller_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Listing not found or not yours.' });
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Listing deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete listing.' });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories.' });
  }
};

module.exports = { getProducts, getProductById, getMyListings, createProduct, updateProduct, deleteProduct, getCategories };