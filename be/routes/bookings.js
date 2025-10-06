const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken, checkRole } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

// Routes cho admin (cần đăng nhập)
router.use(authenticateToken);

// Lấy danh sách đặt sân
router.get('/', bookingController.getBookings);

// Lấy chi tiết đặt sân
router.get('/:id', bookingController.getBookingDetail);

// Xác nhận đặt sân
router.put('/:id/confirm', 
  checkRole(['manager', 'staff']), 
  bookingController.confirmBooking
);

// Hủy đặt sân (admin)
router.put('/:id/cancel', 
  checkRole(['manager']), 
  bookingController.cancelBooking
);

module.exports = router;