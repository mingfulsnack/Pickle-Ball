const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, checkRole } = require('../middleware/auth');

// All employee routes require admin/manager authentication
router.use(authenticateToken);
router.use(checkRole(['manager', 'admin']));

// GET all employees (staff only)
router.get('/', async (req, res) => {
  try {
    const result = await User.query(
      `SELECT id, username, email, full_name, phone, role, created_at
       FROM users 
       WHERE role = 'staff' 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách nhân viên',
    });
  }
});

// GET single employee by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await User.query(
      `SELECT id, username, email, full_name, phone, role, created_at 
       FROM users 
       WHERE id = $1 AND role = 'staff'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin nhân viên',
    });
  }
});

// POST create new employee
router.post('/', async (req, res) => {
  try {
    const { username, email, phone, full_name, password } = req.body;

    if (!username || !phone || !full_name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc',
      });
    }

    const newEmployee = await User.createUser({
      username,
      email: email || null,
      phone,
      full_name,
      password,
      role: 'staff', // Force role to staff
    });

    res.status(201).json({
      success: true,
      message: 'Thêm nhân viên thành công',
      data: newEmployee,
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Tên đăng nhập hoặc email đã tồn tại',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo nhân viên',
    });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, full_name, password } = req.body;

    // Check if employee exists and is staff
    const checkResult = await User.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'staff'`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên',
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(full_name);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email || null);
      paramCount++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    // Update password if provided
    if (password) {
      await User.updatePassword(id, password);
    }

    if (updates.length > 0) {
      values.push(id);
      const query = `UPDATE users SET ${updates.join(
        ', '
      )} WHERE id = $${paramCount} RETURNING id, username, email, full_name, phone, role, created_at`;
      const result = await User.query(query, values);

      res.json({
        success: true,
        message: 'Cập nhật nhân viên thành công',
        data: result.rows[0],
      });
    } else {
      res.json({
        success: true,
        message: 'Không có thông tin nào được cập nhật',
      });
    }
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật nhân viên',
    });
  }
});

// DELETE employee (soft delete or hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists and is staff
    const checkResult = await User.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'staff'`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên',
      });
    }

    // Delete
    await User.query(`DELETE FROM users WHERE id = $1`, [
      id,
    ]);

    res.json({
      success: true,
      message: 'Xóa nhân viên thành công',
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa nhân viên',
    });
  }
});

module.exports = router;
