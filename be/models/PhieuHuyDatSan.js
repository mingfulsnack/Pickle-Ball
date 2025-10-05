const BaseModel = require('./BaseModel');

class PhieuHuyDatSan extends BaseModel {
  constructor() {
    super('phieu_huy_dat_san');
  }

  async createCancel(data) {
    return await this.create(data);
  }
}

module.exports = new PhieuHuyDatSan();
