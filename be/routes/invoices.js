const express = require('express');
const router = express.Router();
const { authenticateToken, checkRole } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

// Basic index
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Invoices endpoint' });
});

// Create / download invoice PDF for a booking (admin/staff)
router.get(
  '/create',
  authenticateToken,
  checkRole(['manager', 'staff']),
  invoiceController.createInvoicePdf
);

module.exports = router;
