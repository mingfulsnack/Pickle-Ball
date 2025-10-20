const BaseModel = require('./BaseModel');
const Ca = require('./Ca');

class BangGiaSan extends BaseModel {
  constructor() {
    super('bang_gia_san');
  }

  // Fetch price segments for a court and day (legacy - for compatibility)
  async getPriceSegments(san_id, day_of_week) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE san_id = $1 AND day_of_week = $2 ORDER BY start_time`,
      [san_id, day_of_week]
    );
    return result.rows;
  }

  // NEW: Use shift-based pricing calculation
  async calcTotalPriceForSlot(san_id, ngay, start_time, end_time) {
    try {
      // Use new shift-based pricing system
      return await Ca.calculateSlotPrice(san_id, ngay, start_time, end_time);
    } catch (error) {
      console.error('Error calculating slot price with shifts:', error);

      // Fallback to old system if available
      try {
        const result = await this.query(
          `SELECT calc_total_price_for_slot($1, $2::date, $3::time, $4::time) as total`,
          [san_id, ngay, start_time, end_time]
        );
        return result.rows[0] ? result.rows[0].total : 0;
      } catch (fallbackError) {
        console.error('Fallback pricing also failed:', fallbackError);
        // Return default price if both systems fail
        return 120000; // Default hourly rate
      }
    }
  }
}

module.exports = new BangGiaSan();
