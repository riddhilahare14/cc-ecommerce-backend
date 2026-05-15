const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getReviews, addReview } = require('../controllers/reviewController');

router.get('/:product_id', getReviews);
router.post('/:product_id', verifyToken, addReview);

module.exports = router;