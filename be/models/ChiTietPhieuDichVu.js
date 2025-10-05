const BaseModel = require('./BaseModel');

class ChiTietPhieuDichVu extends BaseModel {
  constructor() {
    super('chi_tiet_phieu_dich_vu');
  }

  async findByBookingId(phieu_dat_id) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE phieu_dat_id = $1`,
      [phieu_dat_id]
    );
    return result.rows;
  }
}

module.exports = new ChiTietPhieuDichVu();
