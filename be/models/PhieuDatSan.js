const BaseModel = require('./BaseModel');

class PhieuDatSan extends BaseModel {
  constructor() {
    super('phieu_dat_san');
  }

  async createBooking(data) {
    return await this.create(data);
  }

  async findByCode(ma_pd) {
    return await this.findOne({ ma_pd });
  }
}

module.exports = new PhieuDatSan();
