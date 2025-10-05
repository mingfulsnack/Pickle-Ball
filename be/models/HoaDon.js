const BaseModel = require('./BaseModel');

class HoaDon extends BaseModel {
  constructor() {
    super('hoa_don');
  }

  async createInvoice(data) {
    return await this.create(data);
  }

  async findByCode(ma_hd) {
    return await this.findOne({ ma_hd });
  }
}

module.exports = new HoaDon();
