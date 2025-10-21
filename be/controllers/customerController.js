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
      const { ho_ten, sdt, email } = req.body;

      // Kiểm tra số điện thoại đã tồn tại chưa
      const existingCustomer = await User.findCustomerByPhone(sdt);
      if (existingCustomer) {
        return res.status(400).json(
          formatErrorResponse('Số điện thoại đã tồn tại trong hệ thống', {
            duplicateCustomer: existingCustomer,
          })
        );
      }

      // Tạo khách hàng mới
      const newCustomer = await User.create({
        full_name: ho_ten,
        phone: sdt,
        email: email || null,
        role: 'customer',
        username: sdt, // Use phone as username for customers
        password_hash: null, // Customer không cần password
      });

      res.status(201).json(
        formatResponse(
          true,
          {
            id: newCustomer.id,
            ho_ten: newCustomer.full_name,
            sdt: newCustomer.phone,
            email: newCustomer.email,
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
        'SELECT id, full_name, phone, email, created_at FROM users WHERE id = $1 AND role = $2',
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
}

module.exports = new CustomerController();
