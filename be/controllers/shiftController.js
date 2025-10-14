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
    const { khung_gio_id, ten_ca, start_at, end_at, gia_theo_gio } = req.body;

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
    if (overlapping) {
      return res
        .status(400)
        .json(formatErrorResponse('Ca làm việc bị trùng với ca khác'));
    }

    const shiftData = {
      khung_gio_id,
      ten_ca,
      start_at,
      end_at,
      gia_theo_gio,
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
    const { khung_gio_id, ten_ca, start_at, end_at, gia_theo_gio } = req.body;

    const existing = await Ca.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy ca làm việc'));
    }

    // If changing time frame, check new time frame exists
    if (khung_gio_id !== existing.khung_gio_id) {
      const timeFrame = await KhungGio.findById(khung_gio_id);
      if (!timeFrame) {
        return res
          .status(400)
          .json(formatErrorResponse('Khung giờ không tồn tại'));
      }
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

    // Get time frame for bounds checking
    const timeFrame = await KhungGio.findById(khung_gio_id);
    const startMinutes = Ca.timeToMinutes(start_at);
    const endMinutes = Ca.timeToMinutes(end_at);
    const frameStart = Ca.timeToMinutes(timeFrame.start_at);
    const frameEnd = Ca.timeToMinutes(timeFrame.end_at);

    if (startMinutes < frameStart || endMinutes > frameEnd) {
      return res
        .status(400)
        .json(
          formatErrorResponse('Ca làm việc phải nằm trong khung giờ hoạt động')
        );
    }

    // Check for overlapping shifts (exclude current shift)
    const overlapping = await Ca.checkOverlapInTimeFrame(
      khung_gio_id,
      start_at,
      end_at,
      id
    );
    if (overlapping) {
      return res
        .status(400)
        .json(formatErrorResponse('Ca làm việc bị trùng với ca khác'));
    }

    const updateData = { khung_gio_id, ten_ca, start_at, end_at, gia_theo_gio };
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

// Get available shifts for a specific date and time
const getAvailableShifts = async (req, res) => {
  try {
    const { date, time } = req.query;

    if (!date || !time) {
      return res
        .status(400)
        .json(formatErrorResponse('Thiếu thông tin ngày và giờ'));
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date(date).getDay();

    // Find shifts for the requested time
    const shifts = await Ca.findShiftsForDateTime(dayOfWeek, time);

    res.json(
      formatResponse(true, shifts, 'Lấy danh sách ca khả dụng thành công')
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
