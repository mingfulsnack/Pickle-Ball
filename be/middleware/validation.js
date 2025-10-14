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
    tendangnhap: Joi.string().optional(),
    matkhau: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().optional(),
  }).custom((value, helpers) => {
    // Require either (tendangnhap + matkhau) OR (username + password)
    const hasUser = !!(value.tendangnhap || value.username);
    const hasPass = !!(value.matkhau || value.password);
    if (!hasUser || !hasPass) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'login field check'),

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

  // Time frame validation
  timeFrame: Joi.object({
    ten_khung_gio: Joi.string().min(2).max(255).required(),
    start_at: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    end_at: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    ngay_ap_dung: Joi.number().integer().min(0).max(6).required(), // 0=Sunday, 6=Saturday
  }),

  // Shift validation
  shift: Joi.object({
    khung_gio_id: Joi.number().integer().positive().required(),
    ten_ca: Joi.string().min(2).max(255).required(),
    start_at: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    end_at: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required(),
    gia_theo_gio: Joi.number().positive().required(),
  }),

  // Public booking (courts) - support multiple slots and services
  publicBooking: Joi.object({
    contact_id: Joi.number().integer().positive().optional(),
    contact_snapshot: Joi.object({
      contact_name: Joi.string().max(255).optional(),
      contact_phone: Joi.string()
        .pattern(/^[0-9]{10,11}$/)
        .optional(),
      contact_email: Joi.string().email().optional(),
    })
      .allow(null)
      .optional(),
    user_id: Joi.number().integer().positive().allow(null),
    customer: Joi.object().optional(),
    ngay_su_dung: Joi.date().iso().required(),
    slots: Joi.array()
      .items(
        Joi.object({
          san_id: Joi.number().integer().positive().required(),
          start_time: Joi.string()
            .pattern(/^([01]\d|2[0-3]):00$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([01]\d|2[0-3]):00$/)
            .required(),
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

  // Auth register/login
  register: Joi.object({
    username: Joi.string().min(3).max(50).required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().min(2).max(200).required(),
    email: Joi.string().email().optional(),
    phone: Joi.string()
      .pattern(/^[0-9]{10,11}$/)
      .optional(),
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

  // Sân tennis/pickleball
  court: Joi.object({
    ma_san: Joi.string().min(1).max(50).required(),
    ten_san: Joi.string().min(1).max(200).required(),
    trang_thai: Joi.boolean(),
    suc_chua: Joi.number().integer().min(1).max(10).default(4),
    ghi_chu: Joi.string().allow(null, ''),
  }),

  // Dịch vụ
  service: Joi.object({
    ma_dv: Joi.string().min(1).max(50).required(),
    ten_dv: Joi.string().min(1).max(200).required(),
    loai: Joi.string().valid('rent', 'buy').required(),
    don_gia: Joi.number().min(0).required(),
    ghi_chu: Joi.string().allow(null, ''),
  }),

  // Tính giá trước khi booking
  priceCalculation: Joi.object({
    ngay_su_dung: Joi.date().iso().required(),
    slots: Joi.array()
      .items(
        Joi.object({
          san_id: Joi.number().integer().positive().required(),
          start_time: Joi.string()
            .pattern(/^([01]\d|2[0-3]):00$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([01]\d|2[0-3]):00$/)
            .required(),
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
  }),
};

// Export validation middleware functions
const validateTimeFrame = validate(schemas.timeFrame);
const validateShift = validate(schemas.shift);

module.exports = {
  validate,
  schemas,
  validateTimeFrame,
  validateShift,
};
