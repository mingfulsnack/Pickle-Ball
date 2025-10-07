const BaseModel = require('./BaseModel');

class Customer extends BaseModel {
  constructor() {
    super('users'); // Using users table for customers with role filter
  }

  // Find customer by phone
  async findByPhone(phone) {
    const result = await this.query(
      `SELECT * FROM users WHERE phone = $1 AND role = 'customer'`,
      [phone]
    );
    return result.rows[0] || null;
  }

  // Check if phone exists
  async isPhoneExists(phone, excludeId = null) {
    let sql = `SELECT COUNT(*) as count FROM users WHERE phone = $1 AND role = 'customer'`;
    const params = [phone];

    if (excludeId) {
      sql += ` AND id != $2`;
      params.push(excludeId);
    }

    const result = await this.query(sql, params);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get all customers with membership info
  async findAllWithMembership(conditions = {}, page = 1, limit = 20) {
    const baseConditions = [
      { column: 'role', operator: '=', value: 'customer' }
    ];
    
    // Add search condition if provided
    if (conditions.search) {
      baseConditions.push({ 
        column: 'full_name', 
        operator: 'ILIKE', 
        value: `%${conditions.search}%` 
      });
    }

    const offset = (page - 1) * limit;
    const customers = await this.findAll(baseConditions, 'created_at DESC', limit, offset);
    
    // Remove password hashes from response
    customers.forEach(customer => delete customer.password_hash);
    
    return {
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: customers.length,
        totalPages: Math.ceil(customers.length / limit),
        hasNext: false,
        hasPrev: page > 1
      }
    };
  }

  // Get customer by ID with history
  async findByIdWithHistory(id) {
    const customer = await this.query(
      `SELECT id, username, email, role, full_name, phone, created_at 
       FROM users WHERE id = $1 AND role = 'customer'`,
      [id]
    );

    if (customer.rows.length === 0) {
      return null;
    }

    const cust = customer.rows[0];

    // Get booking history (placeholder - would need actual booking data)
    cust.lich_su_dat_ban = [];
    cust.thong_ke = {
      tong_lan_dat: 0,
      lan_hoan_thanh: 0,
      tong_chi_tieu: 0
    };

    return cust;
  }

  // Check if customer has active bookings
  async hasActiveBookings(id) {
    const result = await this.query(
      `SELECT COUNT(*) as count FROM phieu_dat_san 
       WHERE user_id = $1 AND trang_thai IN ('pending', 'confirmed')`,
      [id]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  // Soft delete customer
  async softDelete(id) {
    // Check for active bookings first
    const hasActive = await this.hasActiveBookings(id);
    if (hasActive) {
      throw new Error('Không thể xóa khách hàng đang có đặt sân hoạt động');
    }

    // For now, just mark as inactive (you could add is_deleted column later)
    return await this.update(id, {
      note: 'DELETED - ' + new Date().toISOString()
    });
  }

  // Get membership tiers (placeholder)
  async getMembershipTiers() {
    return [];
  }

  // Create membership tier (placeholder)
  async createMembershipTier(data) {
    throw new Error('Membership tiers not implemented');
  }
}

module.exports = new Customer();