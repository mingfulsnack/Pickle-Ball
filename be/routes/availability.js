const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const availabilityController = require('../controllers/availabilityController');

// Routes public - kiểm tra tình trạng sân

// Kiểm tra tình trạng tất cả sân theo ngày
// GET /api/availability?date=2024-10-07&start_time=09:00&end_time=11:00
router.get('/', availabilityController.getAvailability);

// Lấy khung giờ trống của một sân cụ thể
// GET /api/availability/courts/1?date=2024-10-07
router.get('/courts/:san_id', availabilityController.getCourtAvailableSlots);

// Tính giá cho booking trước khi tạo
// POST /api/availability/calculate-price
router.post('/calculate-price', 
  validate(schemas.priceCalculation), 
  availabilityController.calculatePrice
);

module.exports = router;