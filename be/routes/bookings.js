const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken, checkRole } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');

// Routes cho admin (cần đăng nhập)
router.use(authenticateToken);

// Customer endpoint to list own bookings
router.get('/mine', bookingController.getMyBookings);

// Lấy danh sách đặt sân
router.get('/', bookingController.getBookings);

// Tạo đặt sân mới (admin/staff)
router.post(
  '/',
  checkRole(['manager', 'staff']),
  validate(schemas.publicBooking),
  bookingController.createBooking
);

// Lấy chi tiết đặt sân
router.get('/:id', bookingController.getBookingDetail);

// Xác nhận đặt sân
router.put(
  '/:id/confirm',
  checkRole(['manager', 'staff']),
  bookingController.confirmBooking
);

// Hủy đặt sân (khách hàng hoặc admin/staff)
router.put('/:id/cancel', bookingController.cancelBooking);

// Admin: update booking fields (status, payment)
router.put(
  '/:id',
  checkRole(['manager', 'staff']),
  bookingController.updateBooking
);

module.exports = router;
