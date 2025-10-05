const BaseModel = require('./BaseModel');

class DichVu extends BaseModel {
  constructor() {
    super('dich_vu');
  }

  async findByCode(ma_dv) {
    return await this.findOne({ ma_dv });
  }
}

module.exports = new DichVu();
