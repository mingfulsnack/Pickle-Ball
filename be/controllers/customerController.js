const User = require('../models/User');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

class CustomerController {
  // Lấy danh sách khách hàng với deduplication theo số điện thoại
  async getCustomersWithDeduplication(req, res) {
    try {
      const { search } = req.query;

      let whereClause = "role = 'customer'";
      const values = [];

      if (search) {
        whereClause +=
          ' AND (full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)';
        values.push(`%${search}%`);
      }

      // Query để lấy khách hàng và đếm duplicates theo số điện thoại
      const query = `
                WITH customer_counts AS (
                    SELECT 
                        phone, 
                        COUNT(*) as duplicate_count,
                        MIN(id) as primary_id
                    FROM users 
                    WHERE ${whereClause}
                    GROUP BY phone
                )
                SELECT 
                    u.id,
                    u.full_name,
                    u.phone,
                    u.email,
          u.created_at,
          u.updated_at,
                    cc.duplicate_count
                FROM users u
                INNER JOIN customer_counts cc ON u.phone = cc.phone AND u.id = cc.primary_id
                ORDER BY u.created_at DESC
                LIMIT 50
            `;

      const result = await User.query(query, values);
      const customers = result.rows;

      res.json(
        formatResponse(
          true,
          customers.map((customer) => ({
            id: customer.id,
            ho_ten: customer.full_name,
            sdt: customer.phone,
            email: customer.email,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
            has_duplicates: customer.duplicate_count > 1,
            duplicate_count: customer.duplicate_count,
          })),
          'Danh sách khách hàng'
        )
      );
    } catch (error) {
      console.error('Error getting customers:', error);
      res
        .status(500)
        .json(formatErrorResponse('Lỗi khi lấy danh sách khách hàng'));
    }
  }

  // Tạo khách hàng mới với kiểm tra duplicate
  async createCustomer(req, res) {
    try {
      // Accept either front-end keys or backend validation keys (ho_ten/sdt)
      const { full_name: body_full_name, phone: body_phone, email } = req.body;
      const { ho_ten, sdt } = req.body;

      const full_name = body_full_name || ho_ten;
      const phone = body_phone || sdt;

      // Validate required fields
      if (!full_name || !phone || !email) {
        return res
          .status(400)
          .json(formatErrorResponse('Tên, số điện thoại và email là bắt buộc'));
      }

      // Kiểm tra số điện thoại đã tồn tại chưa
      const existingCustomer = await User.findCustomerByPhone(phone);
      if (existingCustomer) {
        return res.status(400).json(
          formatErrorResponse('Số điện thoại đã tồn tại trong hệ thống', {
            duplicateCustomer: existingCustomer,
          })
        );
      }

      // Kiểm tra email đã tồn tại chưa
      const existingEmail = await User.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingEmail.rows.length > 0) {
        return res
          .status(400)
          .json(formatErrorResponse('Email đã tồn tại trong hệ thống'));
      }

      // Tạo khách hàng mới với email làm username và phone làm password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(phone, 10);

      const newCustomer = await User.create({
        full_name,
        phone,
        email,
        role: 'customer',
        username: email, // Use email as username
        password_hash: hashedPassword, // Use phone as password (hashed)
      });

      res.status(201).json(
        formatResponse(
          true,
          {
            id: newCustomer.id,
            full_name: newCustomer.full_name,
            phone: newCustomer.phone,
            email: newCustomer.email,
            created_at: newCustomer.created_at,
            updated_at: newCustomer.updated_at,
          },
          'Tạo khách hàng thành công'
        )
      );
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json(formatErrorResponse('Lỗi khi tạo khách hàng'));
    }
  }

  // Lấy thông tin chi tiết khách hàng
  async getCustomerById(req, res) {
    try {
      const { id } = req.params;

      const result = await User.query(
        'SELECT id, full_name, phone, email, created_at, updated_at FROM users WHERE id = $1 AND role = $2',
        [id, 'customer']
      );
      const customer = result.rows[0];

      if (!customer) {
        return res
          .status(404)
          .json(formatErrorResponse('Không tìm thấy khách hàng'));
      }

      res.json(
        formatResponse(
          true,
          {
            id: customer.id,
            ho_ten: customer.full_name,
            sdt: customer.phone,
            email: customer.email,
            created_at: customer.created_at,
          },
          'Thông tin khách hàng'
        )
      );
    } catch (error) {
      console.error('Error getting customer:', error);
      res
        .status(500)
        .json(formatErrorResponse('Lỗi khi lấy thông tin khách hàng'));
    }
  }

  // Cập nhật thông tin khách hàng (chỉ cho phép sửa full_name và phone)
  async updateCustomer(req, res) {
    try {
      const { id } = req.params;
      // Accept ho_ten/sdt or full_name/phone from client
      const { full_name: body_full_name, phone: body_phone } = req.body;
      const { ho_ten, sdt } = req.body;

      const full_name = body_full_name || ho_ten;
      const phone = body_phone || sdt;

      // Kiểm tra khách hàng tồn tại
      const existingCustomer = await User.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2',
        [id, 'customer']
      );

      if (existingCustomer.rows.length === 0) {
        return res
          .status(404)
          .json(formatErrorResponse('Không tìm thấy khách hàng'));
      }

      // Kiểm tra số điện thoại đã được sử dụng bởi khách hàng khác chưa
      if (phone) {
        const phoneCheck = await User.query(
          'SELECT id FROM users WHERE phone = $1 AND id != $2',
          [phone, id]
        );

        if (phoneCheck.rows.length > 0) {
          return res
            .status(400)
            .json(
              formatErrorResponse(
                'Số điện thoại đã được sử dụng bởi khách hàng khác'
              )
            );
        }
      }

      // Cập nhật thông tin
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (full_name !== undefined) {
        updateFields.push(`full_name = $${paramIndex++}`);
        values.push(full_name);
      }

      if (phone !== undefined) {
        updateFields.push(`phone = $${paramIndex++}`);
        values.push(phone);
        // Note: username for customers is email and should not be overwritten with phone
      }

      if (updateFields.length === 0) {
        return res
          .status(400)
          .json(formatErrorResponse('Không có thông tin nào để cập nhật'));
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, full_name, phone, email, created_at, updated_at
      `;

      const result = await User.query(query, values);
      const updatedCustomer = result.rows[0];

      res.json(
        formatResponse(
          true,
          {
            id: updatedCustomer.id,
            ho_ten: updatedCustomer.full_name,
            sdt: updatedCustomer.phone,
            email: updatedCustomer.email,
            created_at: updatedCustomer.created_at,
            updated_at: updatedCustomer.updated_at,
          },
          'Cập nhật thông tin khách hàng thành công'
        )
      );
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json(formatErrorResponse('Lỗi khi cập nhật khách hàng'));
    }
  }

  // Xóa khách hàng
  async deleteCustomer(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra khách hàng có tồn tại không
      const existingCustomer = await User.query(
        'SELECT id, full_name FROM users WHERE id = $1 AND role = $2',
        [id, 'customer']
      );

      if (existingCustomer.rows.length === 0) {
        return res
          .status(404)
          .json(formatErrorResponse('Không tìm thấy khách hàng'));
      }

      // Kiểm tra xem khách hàng có đặt sân nào không
      const bookingCheck = await User.query(
        'SELECT COUNT(*) as booking_count FROM phieu_dat_san WHERE user_id = $1',
        [id]
      );

      if (parseInt(bookingCheck.rows[0].booking_count) > 0) {
        return res
          .status(400)
          .json(
            formatErrorResponse(
              'Không thể xóa khách hàng đã có lịch sử đặt sân. Vui lòng liên hệ IT để xử lý.'
            )
          );
      }

      // Xóa khách hàng
      await User.query('DELETE FROM users WHERE id = $1', [id]);

      res.json(
        formatResponse(
          true,
          null,
          `Xóa khách hàng ${existingCustomer.rows[0].full_name} thành công`
        )
      );
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json(formatErrorResponse('Lỗi khi xóa khách hàng'));
    }
  }
}

module.exports = new CustomerController();
