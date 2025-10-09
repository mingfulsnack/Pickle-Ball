const BaseModel = require('./BaseModel');

class CustomerContact extends BaseModel {
  constructor() {
    super('customer_contacts');
  }

  async findByUser(userId) {
    const res = await this.query(
      'SELECT * FROM customer_contacts WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return res.rows;
  }
}

module.exports = new CustomerContact();
