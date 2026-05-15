const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { signup, login, getProfile, updateProfile } = require('../controllers/userController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;