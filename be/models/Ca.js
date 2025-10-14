const BaseModel = require('./BaseModel');

class Ca extends BaseModel {
  constructor() {
    super('ca');
  }

  // Get all shifts for a time frame
  async findByTimeFrame(khungGioId) {
    return await this.findAll(
      { khung_gio_id: khungGioId, is_active: true },
      'start_at ASC'
    );
  }

  // Get shift that covers a specific time within a day
  async findShiftForTime(dayOfWeek, time) {
    const sql = `
      SELECT c.*, kg.ten_khung_gio, kg.ngay_ap_dung
      FROM ca c
      JOIN khung_gio kg ON c.khung_gio_id = kg.id
      WHERE kg.ngay_ap_dung = $1 
      AND kg.is_active = true
      AND c.is_active = true
      AND c.start_at <= $2 
      AND c.end_at > $2
      ORDER BY c.start_at ASC
      LIMIT 1
    `;

    const result = await this.query(sql, [dayOfWeek, time]);
    return result.rows[0] || null;
  }

  // Get shifts that overlap with a time range for a specific day
  async findShiftsInRange(dayOfWeek, startTime, endTime) {
    const sql = `
      SELECT c.*, kg.ten_khung_gio, kg.ngay_ap_dung
      FROM ca c
      JOIN khung_gio kg ON c.khung_gio_id = kg.id
      WHERE kg.ngay_ap_dung = $1 
      AND kg.is_active = true
      AND c.is_active = true
      AND (
        (c.start_at < $3 AND c.end_at > $2) OR
        (c.start_at >= $2 AND c.start_at < $3) OR
        (c.end_at > $2 AND c.end_at <= $3)
      )
      ORDER BY c.start_at ASC
    `;

    const result = await this.query(sql, [dayOfWeek, startTime, endTime]);
    return result.rows || [];
  }

  // Check if shift times overlap within the same time frame
  async checkShiftOverlap(khungGioId, startTime, endTime, excludeId = null) {
    let sql = `
      SELECT * FROM ca 
      WHERE khung_gio_id = $1 
      AND is_active = true
      AND (
        (start_at < $3 AND end_at > $2) OR
        (start_at >= $2 AND start_at < $3) OR
        (end_at > $2 AND end_at <= $3)
      )
    `;
    const params = [khungGioId, startTime, endTime];

    if (excludeId) {
      sql += ' AND id != $4';
      params.push(excludeId);
    }

    const result = await this.query(sql, params);
    return result.rows.length > 0;
  }

  // Calculate total price for a booking slot using new shift-based pricing
  async calculateSlotPrice(sanId, bookingDate, startTime, endTime) {
    // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const date = new Date(bookingDate);
    const dayOfWeek = date.getDay();

    // Get all shifts that overlap with the booking time range
    const shifts = await this.findShiftsInRange(dayOfWeek, startTime, endTime);

    if (shifts.length === 0) {
      throw new Error(
        `Không có ca làm việc nào trong khung giờ ${startTime} - ${endTime}`
      );
    }

    let totalPrice = 0;
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    for (const shift of shifts) {
      const shiftStartMinutes = this.timeToMinutes(shift.start_at);
      const shiftEndMinutes = this.timeToMinutes(shift.end_at);

      // Calculate overlap between booking time and shift time
      const overlapStart = Math.max(startMinutes, shiftStartMinutes);
      const overlapEnd = Math.min(endMinutes, shiftEndMinutes);

      if (overlapStart < overlapEnd) {
        const overlapHours = (overlapEnd - overlapStart) / 60;
        const shiftPrice = parseFloat(shift.gia_tien) || 0;
        totalPrice += overlapHours * shiftPrice;
      }
    }

    return Math.round(totalPrice);
  }

  // Helper: Convert time string (HH:MM) to minutes
  timeToMinutes(timeString) {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
  }

  // Helper: Convert minutes to time string (HH:MM)
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`;
  }

  // Validate shift is within time frame bounds
  async validateShiftBounds(khungGioId, startTime, endTime) {
    const timeFrame = await this.query(
      'SELECT start_at, end_at FROM khung_gio WHERE id = $1',
      [khungGioId]
    );

    if (!timeFrame.rows[0]) {
      throw new Error('Khung giờ không tồn tại');
    }

    const tf = timeFrame.rows[0];
    if (startTime < tf.start_at || endTime > tf.end_at) {
      throw new Error(
        `Ca phải nằm trong khung giờ ${tf.start_at} - ${tf.end_at}`
      );
    }

    return true;
  }

  // Check for overlapping shifts in a time frame (static method for controller use)
  async checkOverlapInTimeFrame(
    khungGioId,
    startTime,
    endTime,
    excludeShiftId = null
  ) {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    let query = `
      SELECT * FROM ca 
      WHERE khung_gio_id = $1 
      AND is_active = true
      AND (
        ($2 >= start_minutes AND $2 < end_minutes)
        OR ($3 > start_minutes AND $3 <= end_minutes)
        OR ($2 <= start_minutes AND $3 >= end_minutes)
      )
    `;

    const params = [khungGioId, startMinutes, endMinutes];

    if (excludeShiftId) {
      query += ' AND id != $4';
      params.push(excludeShiftId);
    }

    const result = await this.query(query, params);
    return result.rows.length > 0;
  }

  // Find shifts for a specific date and time
  async findShiftsForDateTime(dayOfWeek, time) {
    const timeMinutes = this.timeToMinutes(time);

    const query = `
      SELECT c.*, kg.ten_khung_gio, kg.ngay_ap_dung
      FROM ca c
      INNER JOIN khung_gio kg ON c.khung_gio_id = kg.id
      WHERE kg.ngay_ap_dung = $1
      AND kg.is_active = true
      AND c.is_active = true
      AND $2 >= c.start_minutes 
      AND $2 < c.end_minutes
      ORDER BY c.start_at
    `;

    const result = await this.query(query, [dayOfWeek, timeMinutes]);
    return result.rows;
  }
}

module.exports = new Ca();
