const pool = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(200) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      university VARCHAR(300) DEFAULT '',
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      icon VARCHAR(10) DEFAULT '📦'
    );
  `);

  const cats = [
    ['Textbooks',     '📚'],
    ['Electronics',   '💻'],
    ['Stationery',    '✏️'],
    ['Notes & Guides','📝'],
    ['Clothing',      '👕'],
    ['Lab Equipment', '🔬'],
    ['Sports',        '⚽'],
    ['Furniture',     '🪑'],
    ['Food & Snacks', '🍜'],
    ['Miscellaneous', '📦'],
  ];
  for (const [name, icon] of cats) {
    await pool.query(
      'INSERT INTO categories (name, icon) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [name, icon]
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(10,2) NOT NULL,
      is_negotiable BOOLEAN DEFAULT false,
      condition VARCHAR(20) DEFAULT 'good',
      stock INTEGER DEFAULT 1,
      image_url TEXT DEFAULT '',
      is_sold BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      UNIQUE(user_id, product_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      total NUMERIC(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'confirmed',
      delivery_method VARCHAR(50) DEFAULT 'meetup',
      meetup_location TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      price_at_purchase NUMERIC(10,2) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(reviewer_id, product_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      saved_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );
  `);

  // Seed sample products only if empty
  const existing = await pool.query('SELECT id FROM products LIMIT 1');
  if (existing.rows.length === 0) {
    // Need a seed user first
    const hashed = await bcrypt.hash('password123', 10);
    const userRes = await pool.query(
      `INSERT INTO users (full_name, username, email, password, university)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING RETURNING id`,
      ['Demo Student', 'demostudent', 'demo@university.edu', hashed, 'State University']
    );
    const sellerId = userRes.rows[0]?.id;
    if (sellerId) {
      const catRes = await pool.query('SELECT id, name FROM categories');
      const catMap = {};
      catRes.rows.forEach(c => { catMap[c.name] = c.id; });

      const seedProducts = [
        ['Engineering Mathematics Vol. 2', 'Slightly used, all pages intact. Perfect for 2nd year.', 12.00, true, 'like-new', 1, 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400', catMap['Textbooks']],
        ['Scientific Calculator FX-991EX', 'Works perfectly, original box included.', 25.00, false, 'good', 1, 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400', catMap['Electronics']],
        ['Highlighter Set (6 colors)', 'Brand new pack, never opened.', 3.50, false, 'new', 5, 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400', catMap['Stationery']],
        ['Data Structures Handwritten Notes', 'Complete semester notes with diagrams, very neat.', 8.00, true, 'good', 3, 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400', catMap['Notes & Guides']],
        ['University Hoodie – Size M', 'Official uni merch, worn twice. Dark navy.', 18.00, true, 'like-new', 1, 'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=400', catMap['Clothing']],
        ['Adjustable Desk Lamp', 'USB-powered LED lamp, 3 brightness modes.', 14.00, false, 'good', 2, 'https://images.unsplash.com/photo-1534189777960-a7e52571cdb4?w=400', catMap['Furniture']],
        ['Badminton Racket Pair', 'Two rackets + 6 shuttles. Great condition.', 22.00, true, 'good', 1, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400', catMap['Sports']],
        ['Physics Lab Manual + Report Templates', 'Annotated throughout. Saved my lab sessions.', 6.00, false, 'fair', 1, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400', catMap['Lab Equipment']],
      ];

      for (const [title, description, price, is_negotiable, condition, stock, image_url, category_id] of seedProducts) {
        await pool.query(
          `INSERT INTO products (seller_id, category_id, title, description, price, is_negotiable, condition, stock, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [sellerId, category_id, title, description, price, is_negotiable, condition, stock, image_url]
        );
      }
    }
  }

  console.log('✅ All tables + seed data ready');
};
initDB();

const signup = async (req, res) => {
  const { full_name, username, email, password, university } = req.body;
  if (!full_name || !username || !email || !password)
    return res.status(400).json({ message: 'full_name, username, email and password are required.' });
  try {
    const ex = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (ex.rows.length > 0)
      return res.status(409).json({ message: 'Username or email already taken.' });
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, username, email, password, university)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, full_name, username, email, university`,
      [full_name, username, email, hashed, university || '']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required.' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials.' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials.' });
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, full_name: user.full_name, username: user.username, email: user.email, university: user.university } });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, username, email, university, bio, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

const updateProfile = async (req, res) => {
  const { bio, university, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET bio=$1, university=$2, avatar_url=$3 WHERE id=$4
       RETURNING id, full_name, username, email, university, bio, avatar_url`,
      [bio || '', university || '', avatar_url || '', req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

module.exports = { signup, login, getProfile, updateProfile };