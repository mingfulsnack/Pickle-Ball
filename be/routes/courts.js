const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken, checkRole } = require('../middleware/auth');
const courtController = require('../controllers/courtController');

// Routes public (không cần đăng nhập)
// Lấy danh sách sân
router.get('/', courtController.getCourts);

// Lấy chi tiết sân
router.get('/:id', courtController.getCourtDetail);

// Routes admin (cần đăng nhập và quyền)
router.use(authenticateToken);

// Tạo sân mới
router.post('/', 
  checkRole(['manager']), 
  validate(schemas.court), 
  courtController.createCourt
);

// Cập nhật sân
router.put('/:id', 
  checkRole(['manager']), 
  validate(schemas.court), 
  courtController.updateCourt
);

// Xóa sân
router.delete('/:id', 
  checkRole(['manager']), 
  courtController.deleteCourt
);

module.exports = router;