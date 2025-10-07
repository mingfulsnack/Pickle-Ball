const {
  PhieuDatSan,
  ChiTietPhieuSan,
  ChiTietPhieuDichVu,
  BangGiaSan,
  DichVu,
  San,
  PhieuHuyDatSan,
} = require('../models');
const {
  formatResponse,
  formatErrorResponse,
  generateRandomString,
  hashPassword,
} = require('../utils/helpers');

// Create booking (public)
const createBooking = async (req, res) => {
  try {
    const {
      user_id,
      customer,
      ngay_su_dung,
      slots, // [{ san_id, start_time: '09:00', end_time: '11:00' }]
      services = [], // [{ dich_vu_id, so_luong }]
      payment_method,
      note,
    } = req.body;

    // Basic validation
    if (!ngay_su_dung || !Array.isArray(slots) || slots.length === 0) {
      return res
        .status(400)
        .json(formatErrorResponse('Thiếu ngày sử dụng hoặc khung giờ đặt'));
    }

    // Normalize and validate slots: ensure hour-aligned and integer-hour durations
    const normalizedSlots = slots.map((s) => {
      const start = s.start_time;
      const end = s.end_time;
      if (!/^\d{2}:00$/.test(start) || !/^\d{2}:00$/.test(end)) {
        throw new Error('Chỉ cho phép đặt theo giờ chẵn (ví dụ 09:00)');
      }
      const startHour = parseInt(start.split(':')[0], 10);
      const endHour = parseInt(end.split(':')[0], 10);
      if (endHour <= startHour) {
        throw new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
      }
      const duration = endHour - startHour;
      return { ...s, start_time: start, end_time: end, duration };
    });

    const totalHours = normalizedSlots.reduce((acc, s) => acc + s.duration, 0);

    // Check availability for each slot and compute slot prices
    const slotResults = [];
    for (const s of normalizedSlots) {
      // check court exists
      const court = await San.findById(s.san_id);
      if (!court) {
        return res.status(404).json(formatErrorResponse(`Không tìm thấy sân id=${s.san_id}`));
      }

      // Call DB function is_court_available
      const availRes = await PhieuDatSan.query(
        `SELECT is_court_available($1, $2::date, $3::time, $4::time) as available`,
        [s.san_id, ngay_su_dung, s.start_time, s.end_time]
      );
      const available = availRes.rows[0].available;
      if (!available) {
        return res
          .status(409)
          .json(formatErrorResponse(`Sân ${s.san_id} không trống trong khung ${s.start_time}-${s.end_time}`));
      }

      // Calculate price using DB function
      const priceRes = await BangGiaSan.query(
        `SELECT calc_total_price_for_slot($1, $2::date, $3::time, $4::time) as total`,
        [s.san_id, ngay_su_dung, s.start_time, s.end_time]
      );
      const slotTotal = parseFloat(priceRes.rows[0].total || 0);

      slotResults.push({ ...s, slotTotal });
    }

    // Calculate services total
    let servicesTotal = 0;
    const serviceDetails = [];
    for (const svc of services) {
      const dv = await DichVu.findById(svc.dich_vu_id || svc.id);
      if (!dv) {
        return res.status(404).json(formatErrorResponse(`Không tìm thấy dịch vụ id=${svc.dich_vu_id || svc.id}`));
      }
      const qty = svc.so_luong || 1;
      let lineTotal = 0;
      if (dv.loai === 'rent') {
        // rent charged per hour
        lineTotal = parseFloat(dv.don_gia) * qty * totalHours;
      } else {
        lineTotal = parseFloat(dv.don_gia) * qty;
      }
      servicesTotal += lineTotal;
      serviceDetails.push({ dv, qty, lineTotal });
    }

    const slotsTotal = slotResults.reduce((acc, s) => acc + s.slotTotal, 0);
    const grandTotal = Number((slotsTotal + servicesTotal).toFixed(2));

    // Create booking transactionally
    const booking = await PhieuDatSan.transaction(async (client) => {
      let finalUserId = user_id;
      
      // If no user_id provided, create/find customer user
      if (!finalUserId && customer) {
        // Validate required customer info
        if (!customer.full_name || !customer.phone) {
          throw new Error('Vui lòng cung cấp đầy đủ tên và số điện thoại');
        }
        
        const email = customer.email || `${customer.phone}@temp.local`;
        const username = email;
        const password = customer.phone; // Use phone as password
        
        // Check if user already exists by email or phone
        const existingUserSql = `
          SELECT id FROM users 
          WHERE email = $1 OR phone = $2 
          LIMIT 1
        `;
        const existingUserRes = await client.query(existingUserSql, [email, customer.phone]);
        
        if (existingUserRes.rows.length > 0) {
          // User exists, use existing user
          finalUserId = existingUserRes.rows[0].id;
        } else {
          // Create new customer user
          const password_hash = await hashPassword(password);
          
          const createUserSql = `
            INSERT INTO users (username, email, role, full_name, phone, password_hash)
            VALUES ($1, $2, 'customer', $3, $4, $5)
            RETURNING id
          `;
          const userRes = await client.query(createUserSql, [
            username,
            email,
            customer.full_name,
            customer.phone,
            password_hash
          ]);
          finalUserId = userRes.rows[0].id;
        }
      }
      
      if (!finalUserId) {
        throw new Error('Không thể tạo user cho booking');
      }
      
      // create phieu_dat_san
      const ma_pd = 'PD' + Date.now().toString().slice(-8) + generateRandomString(4);
      const insertBookingSql = `
        INSERT INTO phieu_dat_san (ma_pd, user_id, created_by, ngay_su_dung, trang_thai, payment_method, is_paid, note)
        VALUES ($1,$2,$3,$4,$5,$6,false,$7)
        RETURNING *
      `;
      const bookingRes = await client.query(insertBookingSql, [
        ma_pd,
        finalUserId,
        null,
        ngay_su_dung,
        'pending',
        payment_method || null,
        note || null,
      ]);
      const created = bookingRes.rows[0];

      // insert slot details
      for (const s of slotResults) {
        await client.query(
          `INSERT INTO chi_tiet_phieu_san (phieu_dat_id, san_id, start_time, end_time, don_gia, ghi_chu)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [created.id, s.san_id, s.start_time, s.end_time, s.slotTotal, s.ghi_chu || null]
        );
      }

      // insert service details
      for (const sd of serviceDetails) {
        await client.query(
          `INSERT INTO chi_tiet_phieu_dich_vu (phieu_dat_id, dich_vu_id, so_luong, don_gia, ghi_chu)
           VALUES ($1,$2,$3,$4,$5)`,
          [created.id, sd.dv.id, sd.qty, sd.dv.don_gia, null]
        );
      }

      return { booking: created, slots: slotResults, services: serviceDetails, total: grandTotal };
    });

    res.status(201).json(formatResponse(true, booking, 'Đặt sân thành công'));
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json(formatErrorResponse(error.message || 'Lỗi server'));
  }
};

// Get booking by code/token (public)
const getBookingByToken = async (req, res) => {
  try {
    const { token } = req.params; // token maps to ma_pd
    
    // Use query to find booking by ma_pd
    const q = await PhieuDatSan.query('SELECT * FROM phieu_dat_san WHERE ma_pd = $1', [token]);
    const result = q.rows[0];
    
    if (!result) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    }
    
    // fetch slots and services
    const slots = await ChiTietPhieuSan.query('SELECT * FROM chi_tiet_phieu_san WHERE phieu_dat_id = $1', [result.id]);
    const services = await ChiTietPhieuDichVu.query('SELECT * FROM chi_tiet_phieu_dich_vu WHERE phieu_dat_id = $1', [result.id]);

    res.json(formatResponse(true, { booking: result, slots: slots.rows, services: services.rows }, 'Lấy thông tin đặt sân thành công'));
  } catch (error) {
    console.error('Get booking by token error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Cancel booking (public or admin)
const cancelBooking = async (req, res) => {
  try {
    const { token } = req.params; // assume token is ma_pd
    const { reason } = req.body;

    // find booking
    const q = await PhieuDatSan.query('SELECT * FROM phieu_dat_san WHERE ma_pd = $1', [token]);
    const booking = q.rows[0];
    if (!booking) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    }

    if (booking.trang_thai === 'cancelled') {
      return res.status(400).json(formatErrorResponse('Đã hủy trước đó'));
    }

    await PhieuDatSan.transaction(async (client) => {
      await client.query('UPDATE phieu_dat_san SET trang_thai = $1 WHERE id = $2', ['cancelled', booking.id]);
      await client.query('INSERT INTO phieu_huy_dat_san (phieu_dat_id, ly_do, nguoi_thuc_hien, tien_hoan) VALUES ($1,$2,$3,$4)', [booking.id, reason || null, null, 0]);
    });

    res.json(formatResponse(true, null, 'Hủy đặt sân thành công'));
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Admin: list bookings (simple)
const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const q = await PhieuDatSan.query(`SELECT * FROM phieu_dat_san ORDER BY ngay_tao DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json(formatResponse(true, q.rows, 'Lấy danh sách đặt sân thành công'));
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Admin: booking detail
const getBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    let q;
    if (/^\d+$/.test(id)) {
      q = await PhieuDatSan.query('SELECT * FROM phieu_dat_san WHERE id = $1', [id]);
    } else {
      q = await PhieuDatSan.query('SELECT * FROM phieu_dat_san WHERE ma_pd = $1', [id]);
    }
    const booking = q.rows[0];
    if (!booking) return res.status(404).json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    const slots = await ChiTietPhieuSan.query('SELECT * FROM chi_tiet_phieu_san WHERE phieu_dat_id = $1', [booking.id]);
    const services = await ChiTietPhieuDichVu.query('SELECT * FROM chi_tiet_phieu_dich_vu WHERE phieu_dat_id = $1', [booking.id]);
    res.json(formatResponse(true, { booking, slots: slots.rows, services: services.rows }, 'Lấy chi tiết đặt sân thành công'));
  } catch (error) {
    console.error('Get booking detail error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Admin: confirm booking
const confirmBooking = async (req, res) => {
  try {
    const { id } = req.params; // id or ma_pd
    // find booking
    const q = await PhieuDatSan.query(/^\d+$/.test(id) ? 'SELECT * FROM phieu_dat_san WHERE id = $1' : 'SELECT * FROM phieu_dat_san WHERE ma_pd = $1', [id]);
    const booking = q.rows[0];
    if (!booking) return res.status(404).json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    if (booking.trang_thai !== 'pending') return res.status(400).json(formatErrorResponse('Chỉ có thể xác nhận phiếu đang ở trạng thái pending'));
    await PhieuDatSan.query('UPDATE phieu_dat_san SET trang_thai = $1 WHERE id = $2', ['confirmed', booking.id]);
    res.json(formatResponse(true, null, 'Xác nhận đặt sân thành công'));
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingDetail,
  confirmBooking,
  cancelBooking,
  getBookingByToken,
};
