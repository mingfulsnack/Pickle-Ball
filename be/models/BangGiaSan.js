const BaseModel = require('./BaseModel');

class BangGiaSan extends BaseModel {
  constructor() {
    super('bang_gia_san');
  }

  // Fetch price segments for a court and day
  async getPriceSegments(san_id, day_of_week) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE san_id = $1 AND day_of_week = $2 ORDER BY start_time`,
      [san_id, day_of_week]
    );
    return result.rows;
  }

  // Use DB function calc_total_price_for_slot when available
  async calcTotalPriceForSlot(san_id, ngay, start_time, end_time) {
    const result = await this.query(
      `SELECT calc_total_price_for_slot($1, $2::date, $3::time, $4::time) as total`,
      [san_id, ngay, start_time, end_time]
    );
    return result.rows[0] ? result.rows[0].total : 0;
  }
}

module.exports = new BangGiaSan();
