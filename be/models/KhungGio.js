const BaseModel = require('./BaseModel');

class KhungGio extends BaseModel {
  constructor() {
    super('khung_gio');
  }

  // Get time frame by day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  async findByDayOfWeek(dayOfWeek) {
    return await this.findOne({ ngay_ap_dung: dayOfWeek, is_active: true });
  }

  // Get all active time frames
  async findAllActive() {
    return await this.findAll({ is_active: true }, 'ngay_ap_dung ASC');
  }

  // Get time frame with its shifts
  async findWithShifts(id) {
    const timeFrame = await this.findById(id);
    if (!timeFrame) return null;

    const shifts = await this.query(
      `SELECT * FROM ca 
       WHERE khung_gio_id = $1 AND is_active = true 
       ORDER BY start_at ASC`,
      [id]
    );

    return {
      ...timeFrame,
      shifts: shifts.rows || [],
    };
  }

  // Get all time frames with their shifts
  async findAllWithShifts() {
    const timeFrames = await this.findAllActive();
    const result = [];

    for (const tf of timeFrames) {
      const withShifts = await this.findWithShifts(tf.id);
      result.push(withShifts);
    }

    return result;
  }

  // Check if time overlaps with existing frame for the same day
  async checkTimeOverlap(dayOfWeek, startTime, endTime, excludeId = null) {
    let sql = `
      SELECT * FROM khung_gio 
      WHERE ngay_ap_dung = $1 
      AND is_active = true
      AND (
        (start_at < $3 AND end_at > $2) OR
        (start_at >= $2 AND start_at < $3) OR
        (end_at > $2 AND end_at <= $3)
      )
    `;
    const params = [dayOfWeek, startTime, endTime];

    if (excludeId) {
      sql += ' AND id != $4';
      params.push(excludeId);
    }

    const result = await this.query(sql, params);
    return result.rows.length > 0;
  }

  // Get day name in Vietnamese
  static getDayName(dayOfWeek) {
    const dayNames = {
      0: 'Chủ Nhật',
      1: 'Thứ Hai',
      2: 'Thứ Ba',
      3: 'Thứ Tư',
      4: 'Thứ Năm',
      5: 'Thứ Sáu',
      6: 'Thứ Bảy',
    };
    return dayNames[dayOfWeek] || 'Không xác định';
  }
}

module.exports = new KhungGio();
