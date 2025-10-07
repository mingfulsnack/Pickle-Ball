const BaseModel = require('./BaseModel');
const { hashPassword } = require('../utils/helpers');

class User extends BaseModel {
  constructor() {
    super('users'); // Using users table for employees with role filter
  }

  // Find user by username (any role)
  async findByUsername(username) {
    const result = await this.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0] || null;
  }

  // Find staff/manager by username (for authentication)
  async findStaffByUsername(username) {
    const result = await this.query(
      `SELECT * FROM users WHERE username = $1 AND role IN ('staff', 'manager')`,
      [username]
    );
    return result.rows[0] || null;
  }

  // Find user by ID with permissions
  async findByIdWithPermissions(id) {
    const result = await this.query(
      `SELECT id, username, email, role, full_name, phone, created_at 
       FROM users WHERE id = $1 AND role IN ('staff', 'manager')`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Update password
  async updatePassword(id, newPassword) {
    const hashedPassword = await hashPassword(newPassword);
    const result = await this.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2 AND role IN ('staff', 'manager') RETURNING id`,
      [hashedPassword, id]
    );
    return result.rows[0] || null;
  }

  // Create new user
  async createUser(data) {
    const { username, email, password, role, full_name, phone, note } = data;
    
    // Hash password
    const password_hash = await hashPassword(password);

    const userData = {
      username,
      email,
      password_hash,
      role,
      full_name,
      phone,
      note
    };

    return await this.create(userData);
  }

  // Get all users
  async findAllUsers(conditions = {}, page = 1, limit = 20) {
    const baseConditions = [];
    
    // Add role filter if provided
    if (conditions.role) {
      if (Array.isArray(conditions.role)) {
        baseConditions.push({ column: 'role', operator: 'IN', value: conditions.role });
      } else {
        baseConditions.push({ column: 'role', operator: '=', value: conditions.role });
      }
    }
    
    // Add search filter if provided
    if (conditions.search) {
      baseConditions.push({ column: 'full_name', operator: 'ILIKE', value: `%${conditions.search}%` });
    }

    const offset = (page - 1) * limit;
    const users = await this.findAll(baseConditions, 'created_at DESC', limit, offset);
    
    // Remove password hashes from response
    users.forEach(user => delete user.password_hash);
    
    return users;
  }

  // Get customer by phone
  async findCustomerByPhone(phone) {
    const result = await this.query(
      `SELECT id, username, email, role, full_name, phone, created_at 
       FROM users WHERE phone = $1 AND role = 'customer'`,
      [phone]
    );
    return result.rows[0] || null;
  }

  // Check if phone exists
  async isPhoneExists(phone, excludeId = null) {
    let conditions = [{ column: 'phone', operator: '=', value: phone }];
    if (excludeId) {
      conditions.push({ column: 'id', operator: '!=', value: excludeId });
    }
    const users = await this.findAll(conditions);
    return users.length > 0;
  }
}

module.exports = new User();

module.exports = new User();