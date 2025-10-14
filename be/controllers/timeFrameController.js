const { KhungGio, Ca } = require('../models');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Get all time frames with their shifts
const getTimeFrames = async (req, res) => {
  try {
    const timeFrames = await KhungGio.findAllWithShifts();
    res.json(
      formatResponse(true, timeFrames, 'Lấy danh sách khung giờ thành công')
    );
  } catch (error) {
    console.error('Get time frames error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Get time frame by ID with shifts
const getTimeFrameDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const timeFrame = await KhungGio.findWithShifts(id);

    if (!timeFrame) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy khung giờ'));
    }

    res.json(
      formatResponse(true, timeFrame, 'Lấy chi tiết khung giờ thành công')
    );
  } catch (error) {
    console.error('Get time frame detail error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Create new time frame
const createTimeFrame = async (req, res) => {
  try {
    const { ten_khung_gio, start_at, end_at, ngay_ap_dung } = req.body;

    // Check if time frame for this day already exists
    const existing = await KhungGio.findByDayOfWeek(ngay_ap_dung);
    if (existing) {
      return res
        .status(400)
        .json(formatErrorResponse('Khung giờ cho ngày này đã tồn tại'));
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

    const timeFrameData = {
      ten_khung_gio,
      start_at,
      end_at,
      ngay_ap_dung,
      is_active: true,
    };

    const timeFrame = await KhungGio.create(timeFrameData);
    res
      .status(201)
      .json(formatResponse(true, timeFrame, 'Tạo khung giờ thành công'));
  } catch (error) {
    console.error('Create time frame error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Update time frame
const updateTimeFrame = async (req, res) => {
  try {
    const { id } = req.params;
    const { ten_khung_gio, start_at, end_at, ngay_ap_dung } = req.body;

    const existing = await KhungGio.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy khung giờ'));
    }

    // Check if changing to a day that already has a time frame
    if (ngay_ap_dung !== existing.ngay_ap_dung) {
      const dayExists = await KhungGio.findByDayOfWeek(ngay_ap_dung);
      if (dayExists) {
        return res
          .status(400)
          .json(formatErrorResponse('Khung giờ cho ngày này đã tồn tại'));
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

    const updateData = { ten_khung_gio, start_at, end_at, ngay_ap_dung };
    const updated = await KhungGio.update(id, updateData);

    res.json(formatResponse(true, updated, 'Cập nhật khung giờ thành công'));
  } catch (error) {
    console.error('Update time frame error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Delete time frame (soft delete)
const deleteTimeFrame = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if time frame exists
    const existing = await KhungGio.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy khung giờ'));
    }

    // Soft delete by setting is_active to false
    await KhungGio.update(id, { is_active: false });

    // Also deactivate all shifts in this time frame
    await Ca.query('UPDATE ca SET is_active = false WHERE khung_gio_id = $1', [
      id,
    ]);

    res.json(formatResponse(true, null, 'Xóa khung giờ thành công'));
  } catch (error) {
    console.error('Delete time frame error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getTimeFrames,
  getTimeFrameDetail,
  createTimeFrame,
  updateTimeFrame,
  deleteTimeFrame,
};
