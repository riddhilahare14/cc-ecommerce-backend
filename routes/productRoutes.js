const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getProducts, getProductById, getMyListings, createProduct, updateProduct, deleteProduct, getCategories } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/mine', verifyToken, getMyListings);
router.get('/:id', getProductById);
router.post('/', verifyToken, createProduct);
router.put('/:id', verifyToken, updateProduct);
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;