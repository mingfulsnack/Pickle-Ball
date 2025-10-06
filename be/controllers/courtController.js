const { San, BangGiaSan } = require('../models');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Lấy danh sách tất cả sân
const getCourts = async (req, res) => {
  try {
    const { activeOnly = true } = req.query;
    
    const courts = await San.findAll({ 
      activeOnly: activeOnly === 'true' 
    });

    res.json(formatResponse(true, courts, 'Lấy danh sách sân thành công'));
  } catch (error) {
    console.error('Get courts error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Lấy chi tiết sân theo ID
const getCourtDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const court = await San.findById(id);
    if (!court) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy sân'));
    }

    res.json(formatResponse(true, court, 'Lấy chi tiết sân thành công'));
  } catch (error) {
    console.error('Get court detail error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Tạo sân mới (Admin)
const createCourt = async (req, res) => {
  try {
    const { ma_san, ten_san, suc_chua = 4, ghi_chu } = req.body;

    // Kiểm tra mã sân đã tồn tại
    const existing = await San.findByCode(ma_san);
    if (existing) {
      return res.status(400).json(formatErrorResponse('Mã sân đã tồn tại'));
    }

    const courtData = {
      ma_san,
      ten_san,
      trang_thai: true,
      suc_chua,
      ghi_chu
    };

    const court = await San.create(courtData);

    res.status(201).json(formatResponse(true, court, 'Tạo sân thành công'));
  } catch (error) {
    console.error('Create court error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Cập nhật thông tin sân (Admin)
const updateCourt = async (req, res) => {
  try {
    const { id } = req.params;
    const { ma_san, ten_san, trang_thai, suc_chua, ghi_chu } = req.body;

    const existing = await San.findById(id);
    if (!existing) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy sân'));
    }

    // Kiểm tra mã sân trùng lặp nếu thay đổi
    if (ma_san && ma_san !== existing.ma_san) {
      const duplicate = await San.findByCode(ma_san);
      if (duplicate) {
        return res.status(400).json(formatErrorResponse('Mã sân đã tồn tại'));
      }
    }

    const updateData = {};
    if (ma_san !== undefined) updateData.ma_san = ma_san;
    if (ten_san !== undefined) updateData.ten_san = ten_san;
    if (trang_thai !== undefined) updateData.trang_thai = trang_thai;
    if (suc_chua !== undefined) updateData.suc_chua = suc_chua;
    if (ghi_chu !== undefined) updateData.ghi_chu = ghi_chu;

    const updated = await San.update(id, updateData);

    res.json(formatResponse(true, updated, 'Cập nhật sân thành công'));
  } catch (error) {
    console.error('Update court error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Xóa sân (Admin)
const deleteCourt = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra sân có đặt chỗ đang hoạt động không
    const activeBookings = await San.query(
      `SELECT COUNT(*) as count FROM phieu_dat_san pds 
       JOIN chi_tiet_phieu_san ctps ON pds.id = ctps.phieu_dat_id 
       WHERE ctps.san_id = $1 AND pds.trang_thai IN ('pending', 'confirmed')`,
      [id]
    );

    if (parseInt(activeBookings.rows[0].count) > 0) {
      return res.status(400).json(formatErrorResponse('Không thể xóa sân đang có đặt chỗ'));
    }

    const deleted = await San.delete(id);
    if (!deleted) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy sân'));
    }

    res.json(formatResponse(true, null, 'Xóa sân thành công'));
  } catch (error) {
    console.error('Delete court error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getCourts,
  getCourtDetail,
  createCourt,
  updateCourt,
  deleteCourt
};