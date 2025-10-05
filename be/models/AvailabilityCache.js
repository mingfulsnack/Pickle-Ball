const BaseModel = require('./BaseModel');

class AvailabilityCache extends BaseModel {
  constructor() {
    super('availability_cache');
  }

  async findByCourtAndDate(san_id, ngay) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE san_id = $1 AND ngay = $2 ORDER BY start_time`,
      [san_id, ngay]
    );
    return result.rows;
  }

  async markBooked(id, phieu_dat_id) {
    const result = await this.query(
      `UPDATE ${this.tableName} SET is_booked = true, phieu_dat_id = $1 WHERE id = $2 RETURNING *`,
      [phieu_dat_id, id]
    );
    return result.rows[0];
  }
}

module.exports = new AvailabilityCache();
