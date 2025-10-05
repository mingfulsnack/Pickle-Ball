const BaseModel = require('./BaseModel');

class San extends BaseModel {
  constructor() {
    super('san');
  }

  // Lấy tất cả sân (optionally only active)
  async findAll({ activeOnly = false, orderBy = null, limit = null, offset = null } = {}) {
    const conditions = {};
    if (activeOnly) conditions.trang_thai = true;
    // delegate to BaseModel.findAll to avoid recursion
    return await super.findAll(conditions, orderBy, limit, offset);
  }

  async findByCode(ma_san) {
    return await this.findOne({ ma_san });
  }

  // simple helper to get by id
  async findById(id) {
    return await super.findById(id, 'id');
  }
}

module.exports = new San();
