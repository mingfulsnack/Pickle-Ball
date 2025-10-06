const { DichVu } = require('../models');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Lấy danh sách tất cả dịch vụ
const getServices = async (req, res) => {
  try {
    const { loai } = req.query; // 'rent' hoặc 'buy'
    
    let conditions = {};
    if (loai) {
      conditions.loai = loai;
    }

    const services = await DichVu.findAll(conditions, 'loai, ten_dv');
    
    res.json(formatResponse(true, services, 'Lấy danh sách dịch vụ thành công'));
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Lấy chi tiết dịch vụ
const getServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await DichVu.findById(id);
    if (!service) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy dịch vụ'));
    }

    res.json(formatResponse(true, service, 'Lấy chi tiết dịch vụ thành công'));
  } catch (error) {
    console.error('Get service detail error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Tạo dịch vụ mới (Admin)
const createService = async (req, res) => {
  try {
    const { ma_dv, ten_dv, loai, don_gia, ghi_chu } = req.body;

    // Kiểm tra mã dịch vụ đã tồn tại
    const existing = await DichVu.findByCode(ma_dv);
    if (existing) {
      return res.status(400).json(formatErrorResponse('Mã dịch vụ đã tồn tại'));
    }

    const serviceData = {
      ma_dv,
      ten_dv,
      loai,
      don_gia,
      ghi_chu
    };

    const service = await DichVu.create(serviceData);

    res.status(201).json(formatResponse(true, service, 'Tạo dịch vụ thành công'));
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Cập nhật dịch vụ (Admin)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { ma_dv, ten_dv, loai, don_gia, ghi_chu } = req.body;

    const existing = await DichVu.findById(id);
    if (!existing) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy dịch vụ'));
    }

    // Kiểm tra mã dịch vụ trùng lặp nếu thay đổi
    if (ma_dv && ma_dv !== existing.ma_dv) {
      const duplicate = await DichVu.findByCode(ma_dv);
      if (duplicate) {
        return res.status(400).json(formatErrorResponse('Mã dịch vụ đã tồn tại'));
      }
    }

    const updateData = {};
    if (ma_dv !== undefined) updateData.ma_dv = ma_dv;
    if (ten_dv !== undefined) updateData.ten_dv = ten_dv;
    if (loai !== undefined) updateData.loai = loai;
    if (don_gia !== undefined) updateData.don_gia = don_gia;
    if (ghi_chu !== undefined) updateData.ghi_chu = ghi_chu;

    const updated = await DichVu.update(id, updateData);

    res.json(formatResponse(true, updated, 'Cập nhật dịch vụ thành công'));
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Xóa dịch vụ (Admin)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra dịch vụ có được sử dụng trong booking không
    const usageCheck = await DichVu.query(
      `SELECT COUNT(*) as count FROM chi_tiet_phieu_dich_vu WHERE dich_vu_id = $1`,
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json(formatErrorResponse('Không thể xóa dịch vụ đã được sử dụng'));
    }

    const deleted = await DichVu.delete(id);
    if (!deleted) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy dịch vụ'));
    }

    res.json(formatResponse(true, null, 'Xóa dịch vụ thành công'));
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getServices,
  getServiceDetail,
  createService,
  updateService,
  deleteService
};