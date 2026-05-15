const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { placeOrder, getOrders } = require('../controllers/orderController');

router.use(verifyToken);
router.post('/', placeOrder);
router.get('/', getOrders);

module.exports = router;