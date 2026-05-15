const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getSaved, toggleSaved } = require('../controllers/savedController');

router.use(verifyToken);
router.get('/', getSaved);
router.post('/toggle', toggleSaved);

module.exports = router;