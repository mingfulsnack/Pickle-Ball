const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, checkRole } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Apply auth middleware for all customer routes
router.use(authenticateToken);

// Middleware xác thực cho admin/staff
const adminAuth = checkRole(['manager', 'staff']);

// Routes
router.get('/', adminAuth, customerController.getCustomersWithDeduplication);
router.post(
  '/',
  adminAuth,
  validation.validateCustomer,
  customerController.createCustomer
);
router.get('/:id', adminAuth, customerController.getCustomerById);
router.put('/:id', adminAuth, customerController.updateCustomer);
router.delete('/:id', adminAuth, customerController.deleteCustomer);

module.exports = router;
