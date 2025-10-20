const { Ca, KhungGio } = require('../models');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Get all shifts for a time frame
const getShiftsByTimeFrame = async (req, res) => {
  try {
    const { timeFrameId } = req.params;

    // Verify time frame exists
    const timeFrame = await KhungGio.findById(timeFrameId);
    if (!timeFrame) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy khung giờ'));
    }

    const shifts = await Ca.query(
      'SELECT * FROM ca WHERE khung_gio_id = $1 AND is_active = true ORDER BY start_at',
      [timeFrameId]
    );

    res.json(formatResponse(true, shifts, 'Lấy danh sách ca thành công'));
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Get shift detail by ID
const getShiftDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const shift = await Ca.findById(id);

    if (!shift) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy ca làm việc'));
    }

    res.json(formatResponse(true, shift, 'Lấy chi tiết ca thành công'));
  } catch (error) {
    console.error('Get shift detail error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Create new shift
const createShift = async (req, res) => {
  try {
    const { khung_gio_id, ten_ca, start_at, end_at, gia_tien } = req.body;

    // Check if time frame exists
    const timeFrame = await KhungGio.findById(khung_gio_id);
    if (!timeFrame) {
      return res
        .status(400)
        .json(formatErrorResponse('Khung giờ không tồn tại'));
    }

    // Validate time range
    if (start_at >= end_at) {
      return res
        .status(400)
        .json(
          formatErrorResponse(
            'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc'
          )
        );
    }

    // Convert time strings to minutes for validation
    const startMinutes = Ca.timeToMinutes(start_at);
    const endMinutes = Ca.timeToMinutes(end_at);
    const frameStart = Ca.timeToMinutes(timeFrame.start_at);
    const frameEnd = Ca.timeToMinutes(timeFrame.end_at);

    // Check if shift is within time frame bounds
    if (startMinutes < frameStart || endMinutes > frameEnd) {
      return res
        .status(400)
        .json(
          formatErrorResponse('Ca làm việc phải nằm trong khung giờ hoạt động')
        );
    }

    // Check for overlapping shifts in the same time frame
    const overlapping = await Ca.checkOverlapInTimeFrame(
      khung_gio_id,
      start_at,
      end_at
    );
    if (overlapping && overlapping.length > 0) {
      const details = overlapping.map(
        (s) => `${s.ten_ca}: ${s.start_at} - ${s.end_at}`
      );
      return res
        .status(400)
        .json(formatErrorResponse('Ca làm việc bị trùng với ca khác', details));
    }

    const shiftData = {
      khung_gio_id,
      ten_ca,
      start_at,
      end_at,
      gia_tien,
      is_active: true,
    };

    const shift = await Ca.create(shiftData);
    res.status(201).json(formatResponse(true, shift, 'Tạo ca thành công'));
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Update shift
const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    // allow partial updates
    const payload = req.body || {};
    const { khung_gio_id, ten_ca, start_at, end_at, gia_tien } = payload;

    const existing = await Ca.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy ca làm việc'));
    }

    // Determine final values (use existing where payload doesn't include)
    const finalKhungGioId =
      khung_gio_id !== undefined ? khung_gio_id : existing.khung_gio_id;
    const finalStart = start_at !== undefined ? start_at : existing.start_at;
    const finalEnd = end_at !== undefined ? end_at : existing.end_at;
    const finalTenCa = ten_ca !== undefined ? ten_ca : existing.ten_ca;
    const finalGia = gia_tien !== undefined ? gia_tien : existing.gia_tien;

    // If changing time frame, check new time frame exists
    const timeFrame = await KhungGio.findById(finalKhungGioId);
    if (!timeFrame) {
      return res
        .status(400)
        .json(formatErrorResponse('Khung giờ không tồn tại'));
    }

    // Validate time range
    if (finalStart >= finalEnd) {
      return res
        .status(400)
        .json(
          formatErrorResponse(
            'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc'
          )
        );
    }

    // Bounds checking
    const startMinutes = Ca.timeToMinutes(finalStart);
    const endMinutes = Ca.timeToMinutes(finalEnd);
    const frameStart = Ca.timeToMinutes(timeFrame.start_at);
    const frameEnd = Ca.timeToMinutes(timeFrame.end_at);
    if (startMinutes < frameStart || endMinutes > frameEnd) {
      return res
        .status(400)
        .json(
          formatErrorResponse('Ca làm việc phải nằm trong khung giờ hoạt động')
        );
    }

    // Overlap check excluding current shift
    const overlapping = await Ca.checkOverlapInTimeFrame(
      finalKhungGioId,
      finalStart,
      finalEnd,
      id
    );
    if (overlapping && overlapping.length > 0) {
      const details = overlapping.map(
        (s) => `${s.ten_ca}: ${s.start_at} - ${s.end_at}`
      );
      return res
        .status(400)
        .json(formatErrorResponse('Ca làm việc bị trùng với ca khác', details));
    }

    const updateData = {
      khung_gio_id: finalKhungGioId,
      ten_ca: finalTenCa,
      start_at: finalStart,
      end_at: finalEnd,
      gia_tien: finalGia,
    };
    const updated = await Ca.update(id, updateData);

    res.json(formatResponse(true, updated, 'Cập nhật ca thành công'));
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Delete shift (soft delete)
const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift exists
    const existing = await Ca.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy ca làm việc'));
    }

    // Soft delete by setting is_active to false
    await Ca.update(id, { is_active: false });

    res.json(formatResponse(true, null, 'Xóa ca thành công'));
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Get available shifts for a specific date (public endpoint)
const getAvailableShifts = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json(formatErrorResponse('Thiếu thông tin ngày'));
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date(date).getDay();

    // Get all active shifts for this day of week
    const shifts = await Ca.query(
      `
      SELECT c.*, kg.ten_khung_gio, kg.start_at as khung_gio_start, kg.end_at as khung_gio_end
      FROM ca c
      JOIN khung_gio kg ON c.khung_gio_id = kg.id
      WHERE kg.ngay_ap_dung = $1 
      AND kg.is_active = true
      AND c.is_active = true
      ORDER BY c.start_at ASC
    `,
      [dayOfWeek]
    );

    res.json(
      formatResponse(true, shifts.rows, 'Lấy danh sách ca khả dụng thành công')
    );
  } catch (error) {
    console.error('Get available shifts error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getShiftsByTimeFrame,
  getShiftDetail,
  createShift,
  updateShift,
  deleteShift,
  getAvailableShifts,
};
