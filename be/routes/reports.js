const express = require('express');
const { generateReport } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate report endpoint (protected)
router.get('/generate', authenticateToken, generateReport);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Reports endpoint - not implemented for court booking system',
    data: [],
  });
});

module.exports = router;
