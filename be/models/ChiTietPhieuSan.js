const BaseModel = require('./BaseModel');

class ChiTietPhieuSan extends BaseModel {
  constructor() {
    super('chi_tiet_phieu_san');
  }

  async findByBookingId(phieu_dat_id) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE phieu_dat_id = $1 ORDER BY start_time`,
      [phieu_dat_id]
    );
    return result.rows;
  }
}

module.exports = new ChiTietPhieuSan();
