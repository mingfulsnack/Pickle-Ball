const { User } = require('../models');
const {
  verifyPassword,
  generateToken,
  formatResponse,
  formatErrorResponse,
} = require('../utils/helpers');

// Đăng nhập
const login = async (req, res) => {
  try {
    console.debug('Login payload:', req.body);
    // accept both 'username'/'password' and legacy 'tendangnhap'/'matkhau'
    const username = req.body.username || req.body.tendangnhap;
    const password = req.body.password || req.body.matkhau;

    if (!username || !password) {
      return res
        .status(400)
        .json(formatErrorResponse('Tên đăng nhập và mật khẩu là bắt buộc'));
    }

    // Find any user by username (allow customers as well)
    const user = await User.findByUsername(username);

    if (!user) {
      return res
        .status(401)
        .json(formatErrorResponse('Tên đăng nhập hoặc mật khẩu không đúng'));
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res
        .status(401)
        .json(formatErrorResponse('Tên đăng nhập hoặc mật khẩu không đúng'));
    }

    // Create token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // Remove password before returning
    const safeUser = { ...user };
    delete safeUser.password_hash;

    res.json(
      formatResponse(true, { token, user: safeUser }, 'Đăng nhập thành công')
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const { matkhau_cu, matkhau_moi } = req.body;
    const userId = req.user.id;

    if (!matkhau_cu || !matkhau_moi) {
      return res
        .status(400)
        .json(formatErrorResponse('Mật khẩu cũ và mật khẩu mới là bắt buộc'));
    }

    if (matkhau_moi.length < 6) {
      return res
        .status(400)
        .json(formatErrorResponse('Mật khẩu mới phải có ít nhất 6 ký tự'));
    }

    // Lấy thông tin nhân viên hiện tại
    const employee = await User.findById(userId);
    if (!employee) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy nhân viên'));
    }

    // Kiểm tra mật khẩu cũ
    const isValidOldPassword = await verifyPassword(
      matkhau_cu,
      employee.password_hash
    );
    if (!isValidOldPassword) {
      return res
        .status(400)
        .json(formatErrorResponse('Mật khẩu cũ không đúng'));
    }

    // Cập nhật mật khẩu
    await User.updatePassword(userId, matkhau_moi);

    res.json(formatResponse(true, null, 'Đổi mật khẩu thành công'));
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Lấy thông tin profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const employee = await User.findByIdWithPermissions(userId);

    if (!employee) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy thông tin nhân viên'));
    }

    res.json(
      formatResponse(true, employee, 'Lấy thông tin profile thành công')
    );
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  login,
  changePassword,
  getProfile,
};

// Public registration for customers
const register = async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    if (!username || !password || !full_name) {
      return res
        .status(400)
        .json(formatErrorResponse('Thiếu thông tin đăng ký'));
    }

    // check existing
    const existing = await User.findByUsername(username);
    if (existing) {
      return res
        .status(409)
        .json(formatErrorResponse('Tên tài khoản đã tồn tại'));
    }

    const password_hash = await require('../utils/helpers').hashPassword(
      password
    );
    const created = await User.create({
      username,
      email,
      password_hash,
      role: 'customer',
      full_name,
      phone,
    });

    res
      .status(201)
      .json(formatResponse(true, { user: created }, 'Đăng ký thành công'));
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// export register as well
module.exports.register = register;
