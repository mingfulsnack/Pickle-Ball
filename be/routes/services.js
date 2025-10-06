const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken, checkRole } = require('../middleware/auth');
const serviceController = require('../controllers/serviceController');

// Routes public (không cần đăng nhập)
// Lấy danh sách dịch vụ
router.get('/', serviceController.getServices);

// Lấy chi tiết dịch vụ
router.get('/:id', serviceController.getServiceDetail);

// Routes admin (cần đăng nhập và quyền)
router.use(authenticateToken);

// Tạo dịch vụ mới
router.post('/', 
  checkRole(['manager']), 
  validate(schemas.service), 
  serviceController.createService
);

// Cập nhật dịch vụ
router.put('/:id', 
  checkRole(['manager']), 
  validate(schemas.service), 
  serviceController.updateService
);

// Xóa dịch vụ
router.delete('/:id', 
  checkRole(['manager']), 
  serviceController.deleteService
);

module.exports = router;