const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map((detail) => detail.message),
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  // Đăng nhập
  login: Joi.object({
    tendangnhap: Joi.string().required(),
    matkhau: Joi.string().required(),
  }),

  // Nhân viên
  employee: Joi.object({
    hoten: Joi.string().min(2).max(200).required(),
    tendangnhap: Joi.string().min(3).max(50),
    matkhau: Joi.string().min(6),
    mavaitro: Joi.number().integer().positive(),
    sodienthoai: Joi.string().pattern(/^[0-9]{10,11}$/),
    email: Joi.string().email(),
    calam: Joi.string().max(100),
    is_active: Joi.boolean(),
  }),

  // Khách hàng
  customer: Joi.object({
    hoten: Joi.string().min(2).max(100).required(),
    gioitinh: Joi.string().valid('Nam', 'Nữ', 'Khác'),
    sodienthoai: Joi.string()
      .pattern(/^[0-9]{10,11}$/)
      .required(),
    email: Joi.string().email(),
    diachi: Joi.string(),
    mahang: Joi.number().integer().positive(),
  }),

  // Đặt bàn
  booking: Joi.object({
    makh: Joi.number().integer().positive(),
    guest_hoten: Joi.string().max(100),
    guest_sodienthoai: Joi.string().pattern(/^[0-9]{10,11}$/),
    guest_email: Joi.string().email(),
    maban: Joi.number().integer().positive().required(),
    songuoi: Joi.number().integer().min(1).max(20).required(),
    thoigian_dat: Joi.date().iso().required(),
    ghichu: Joi.string(),
  }).or('makh', 'guest_hoten'), // Phải có ít nhất một trong hai

  // Public booking (courts) - support multiple slots and services
  publicBooking: Joi.object({
    user_id: Joi.number().integer().positive().allow(null),
    customer: Joi.object().optional(),
    ngay_su_dung: Joi.date().iso().required(),
    slots: Joi.array()
      .items(
        Joi.object({
          san_id: Joi.number().integer().positive().required(),
          start_time: Joi.string().pattern(/^([01]\d|2[0-3]):00$/).required(),
          end_time: Joi.string().pattern(/^([01]\d|2[0-3]):00$/).required(),
          ghi_chu: Joi.string().allow(null, ''),
        })
      )
      .min(1)
      .required(),
    services: Joi.array()
      .items(
        Joi.object({
          dich_vu_id: Joi.number().integer().positive().required(),
          so_luong: Joi.number().integer().min(1).default(1),
        })
      )
      .optional(),
    payment_method: Joi.string().valid('cash', 'bank_transfer').optional(),
    note: Joi.string().allow(null, ''),
  }),

  // Bàn
  table: Joi.object({
    mavung: Joi.number().integer().positive().required(),
    tenban: Joi.string().max(50).required(),
    soghe: Joi.number().integer().min(1).max(20).required(),
    vitri: Joi.string().max(200),
    trangthai: Joi.string().valid('Trong', 'DaDat', 'DangSuDung', 'Lock'),
    ghichu: Joi.string(),
  }),

  // Món ăn
  dish: Joi.object({
    tenmon: Joi.string().min(1).max(300).required(),
    madanhmuc: Joi.number().integer().positive().required(),
    dongia: Joi.number().min(0).required(),
    trangthai: Joi.string().valid('Con', 'Het'),
    is_addon: Joi.boolean(),
    ghichu: Joi.string().allow(null, ''),
    image: Joi.string().allow(null, ''),
  }),

  // Set buffet
  buffetSet: Joi.object({
    tenset: Joi.string().min(1).max(300).required(),
    dongia: Joi.number().min(0).required(),
    thoigian_batdau: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    thoigian_ketthuc: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    mota: Joi.string().allow('', null),
    madanhmuc: Joi.number().integer().min(1),
    mon_an: Joi.array().items(Joi.number().integer()),
    trangthai: Joi.string().valid('HoatDong', 'TamNgung'),
    image: Joi.string().allow(null, ''),
  }),

  // Khuyến mãi
  promotion: Joi.object({
    tenkm: Joi.string().min(1).max(300).required(),
    loai_km: Joi.string().valid('percentage', 'fixed', 'buyxgety').required(),
    giatri: Joi.number().min(0).required(),
    ngay_batdau: Joi.date().iso().required(),
    ngay_ketthuc: Joi.date().iso().required(),
    dieu_kien: Joi.object(),
    is_active: Joi.boolean(),
  }),
};

module.exports = {
  validate,
  schemas,
};
