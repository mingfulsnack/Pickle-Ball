const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Invoices endpoint - not implemented for court booking system',
    data: []
  });
});

module.exports = router;