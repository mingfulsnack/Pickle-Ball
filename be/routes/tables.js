const express = require('express');
const router = express.Router();

// Placeholder route for tables (legacy restaurant system)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tables endpoint - legacy restaurant system',
    data: []
  });
});

module.exports = router;