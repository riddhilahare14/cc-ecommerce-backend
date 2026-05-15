const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes    = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes    = require('./routes/cartRoutes');
const orderRoutes   = require('./routes/orderRoutes');
const reviewRoutes  = require('./routes/reviewRoutes');
const savedRoutes   = require('./routes/savedRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/saved',    savedRoutes);

app.get('/', (req, res) => res.send('Student Marketplace API running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));