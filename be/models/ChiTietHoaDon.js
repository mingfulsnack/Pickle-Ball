const BaseModel = require('./BaseModel');

class ChiTietHoaDon extends BaseModel {
  constructor() {
    super('chi_tiet_hoa_don');
  }

  async findByInvoiceId(hoa_don_id) {
    const result = await this.query(
      `SELECT * FROM ${this.tableName} WHERE hoa_don_id = $1`,
      [hoa_don_id]
    );
    return result.rows;
  }
}

module.exports = new ChiTietHoaDon();
