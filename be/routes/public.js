const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const bookingController = require('../controllers/bookingController');
const courtController = require('../controllers/courtController');
const availabilityController = require('../controllers/availabilityController');
const serviceController = require('../controllers/serviceController');

// Middleware to prevent caching for public routes
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Routes public - không cần đăng nhập

// === COURT BOOKING SYSTEM ===
// Lấy danh sách sân
router.get('/courts', courtController.getCourts);

// Kiểm tra tình trạng sân trống
router.get('/availability', availabilityController.getAvailability);

// Lấy khung giờ trống của sân cụ thể
router.get('/availability/courts/:san_id', availabilityController.getCourtAvailableSlots);

// Tính giá trước khi đặt
router.post('/availability/calculate-price', validate(schemas.priceCalculation), availabilityController.calculatePrice);

// Lấy danh sách dịch vụ
router.get('/services', serviceController.getServices);

// Tạo đặt sân mới (khách hàng public)
router.post('/bookings', validate(schemas.publicBooking), bookingController.createBooking);

// Lấy thông tin đặt sân bằng token (khách hàng)
router.get('/bookings/:token', bookingController.getBookingByToken);

// Hủy đặt sân bằng token (khách hàng)
router.put('/bookings/:token/cancel', bookingController.cancelBooking);

module.exports = router;