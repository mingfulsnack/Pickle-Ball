const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Đăng nhập
router.post('/login', validate(schemas.login), authController.login);

// Admin login
router.post('/admin-login', validate(schemas.login), authController.adminLogin);

// Public registration
router.post('/register', validate(schemas.register), authController.register);

// Đổi mật khẩu (cần đăng nhập)
router.put(
  '/change-password',
  authenticateToken,
  authController.changePassword
);

// Lấy thông tin profile (cần đăng nhập)
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
