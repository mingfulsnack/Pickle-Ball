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
        return res
          .status(404)
          .json(formatErrorResponse(`Không tìm thấy sân id=${s.san_id}`));
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
          .json(
            formatErrorResponse(
              `Sân ${s.san_id} không trống trong khung ${s.start_time}-${s.end_time}`
            )
          );
      }

      // Calculate price using DB function
      try {
        const priceRes = await BangGiaSan.query(
          `SELECT calc_total_price_for_slot($1, $2::date, $3::time, $4::time) as total`,
          [s.san_id, ngay_su_dung, s.start_time, s.end_time]
        );
        const slotTotal = parseFloat(priceRes.rows[0].total || 0);
        slotResults.push({ ...s, slotTotal });
      } catch (err) {
        console.warn(
          'Price calc validation error during booking:',
          err.message || err
        );
        return res
          .status(400)
          .json(formatErrorResponse(err.message || 'Validation error'));
      }
    }

    // Calculate services total
    let servicesTotal = 0;
    const serviceDetails = [];
    for (const svc of services) {
      const dv = await DichVu.findById(svc.dich_vu_id || svc.id);
      if (!dv) {
        return res
          .status(404)
          .json(
            formatErrorResponse(
              `Không tìm thấy dịch vụ id=${svc.dich_vu_id || svc.id}`
            )
          );
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
      // Require authenticated user for booking: do not auto-create customers here
      const finalUserId = user_id;
      if (!finalUserId) {
        throw new Error('Vui lòng đăng nhập trước khi đặt sân');
      }

      // create phieu_dat_san (ensure columns for totals exist)
      const ma_pd =
        'PD' + Date.now().toString().slice(-8) + generateRandomString(4);

      // Ensure columns exist (safe: ADD COLUMN IF NOT EXISTS)
      await client.query(
        `ALTER TABLE phieu_dat_san ADD COLUMN IF NOT EXISTS tien_san numeric DEFAULT 0`
      );
      await client.query(
        `ALTER TABLE phieu_dat_san ADD COLUMN IF NOT EXISTS tien_dich_vu numeric DEFAULT 0`
      );
      await client.query(
        `ALTER TABLE phieu_dat_san ADD COLUMN IF NOT EXISTS tong_tien numeric DEFAULT 0`
      );

      // Determine contact snapshot: prefer explicit contact_id -> contact_snapshot payload -> fallback to user profile
      let contactSnapshot = { name: null, phone: null, email: null };
      if (req.body.contact_id) {
        const contactQ = await client.query(
          'SELECT * FROM customer_contacts WHERE id = $1',
          [req.body.contact_id]
        );
        const contact = contactQ.rows[0];
        if (!contact || contact.user_id !== finalUserId) {
          throw new Error('Liên hệ không tồn tại hoặc không thuộc người dùng');
        }
        contactSnapshot.name = contact.full_name;
        contactSnapshot.phone = contact.phone;
        contactSnapshot.email = contact.email;
      } else if (req.body.contact_snapshot) {
        // client may send a lightweight snapshot when user chooses their own profile
        const cs = req.body.contact_snapshot;
        contactSnapshot.name = cs.contact_name || null;
        contactSnapshot.phone = cs.contact_phone || null;
        contactSnapshot.email = cs.contact_email || null;
      } else {
        // fallback: try to fetch basic user info from users table
        const userQ = await client.query(
          'SELECT full_name, phone, email FROM users WHERE id = $1',
          [finalUserId]
        );
        const u = userQ.rows[0];
        if (u) {
          contactSnapshot.name = u.full_name || null;
          contactSnapshot.phone = u.phone || null;
          contactSnapshot.email = u.email || null;
        }
      }

      // Mark booking as paid immediately when payment_method indicates online transfer
      const isPaid = payment_method === 'bank_transfer';

      const insertBookingSql = `
        INSERT INTO phieu_dat_san (ma_pd, user_id, contact_id, contact_name, contact_phone, contact_email, created_by, ngay_su_dung, trang_thai, payment_method, is_paid, note, tien_san, tien_dich_vu, tong_tien)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING *
      `;
      const bookingRes = await client.query(insertBookingSql, [
        ma_pd,
        finalUserId,
        req.body.contact_id || null,
        contactSnapshot.name,
        contactSnapshot.phone,
        contactSnapshot.email,
        null,
        ngay_su_dung,
        'pending',
        payment_method || null,
        isPaid,
        note || null,
        slotsTotal,
        servicesTotal,
        grandTotal,
      ]);
      const created = bookingRes.rows[0];

      // insert slot details
      for (const s of slotResults) {
        await client.query(
          `INSERT INTO chi_tiet_phieu_san (phieu_dat_id, san_id, start_time, end_time, don_gia, ghi_chu)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            created.id,
            s.san_id,
            s.start_time,
            s.end_time,
            s.slotTotal,
            s.ghi_chu || null,
          ]
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

      return {
        booking: created,
        slots: slotResults,
        services: serviceDetails,
        total: grandTotal,
      };
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
    // Accept either :token (public route) or :id (admin route) and normalize
    const token = req.params.token || req.params.id;

    // Use query to find booking by ma_pd
    const q = await PhieuDatSan.query(
      'SELECT * FROM phieu_dat_san WHERE ma_pd = $1',
      [token]
    );
    const result = q.rows[0];

    if (!result) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    }

    // fetch slots
    const slotsQ = await ChiTietPhieuSan.query(
      'SELECT * FROM chi_tiet_phieu_san WHERE phieu_dat_id = $1',
      [result.id]
    );
    const slots = slotsQ.rows || [];

    // compute total hours from slots (expect time format HH:MM[:SS])
    const parseToMinutes = (t) => {
      if (!t) return 0;
      const parts = t.split(':').map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    };
    const totalHours = slots.reduce((acc, s) => {
      const start = parseToMinutes(s.start_time);
      const end = parseToMinutes(s.end_time);
      const dur = Math.max(0, (end - start) / 60);
      return acc + dur;
    }, 0);

    // fetch services joined with dich_vu to get don_gia and loai
    const servicesQ = await ChiTietPhieuDichVu.query(
      `SELECT ctpd.*, dv.id as dv_id, dv.ma_dv, dv.ten_dv, dv.loai as dv_loai, dv.don_gia as dv_don_gia
       FROM chi_tiet_phieu_dich_vu ctpd
       LEFT JOIN dich_vu dv ON ctpd.dich_vu_id = dv.id
       WHERE ctpd.phieu_dat_id = $1`,
      [result.id]
    );
    const rawServices = servicesQ.rows || [];

    // enrich services with dv info and compute lineTotal
    const enrichedServices = rawServices.map((sv) => {
      const so_luong = sv.so_luong || sv.qty || 1;
      const don_gia =
        sv.don_gia !== null && sv.don_gia !== undefined
          ? parseFloat(sv.don_gia)
          : sv.dv_don_gia !== null && sv.dv_don_gia !== undefined
          ? parseFloat(sv.dv_don_gia)
          : 0;
      const loai = sv.dv_loai || null;
      let lineTotal = 0;
      if (loai === 'rent') {
        lineTotal = don_gia * so_luong * totalHours;
      } else {
        lineTotal = don_gia * so_luong;
      }
      return {
        ...sv,
        so_luong,
        don_gia,
        lineTotal: Number(lineTotal.toFixed(2)),
        dv: {
          id: sv.dv_id || sv.dich_vu_id,
          ma_dv: sv.ma_dv,
          ten_dv: sv.ten_dv,
          loai: loai,
          don_gia: don_gia,
        },
      };
    });

    // Ensure totals are present in response (use stored values if available, else compute)
    const bookingTotals = {
      tien_san:
        result.tien_san !== undefined && result.tien_san !== null
          ? parseFloat(result.tien_san)
          : null,
      tien_dich_vu:
        result.tien_dich_vu !== undefined && result.tien_dich_vu !== null
          ? parseFloat(result.tien_dich_vu)
          : null,
      tong_tien:
        result.tong_tien !== undefined && result.tong_tien !== null
          ? parseFloat(result.tong_tien)
          : null,
    };
    if (bookingTotals.tong_tien === null) {
      const slotsSum = slots.reduce(
        (acc, s) => acc + parseFloat(s.don_gia || s.slotTotal || 0),
        0
      );
      const servicesSum = enrichedServices.reduce(
        (acc, s) => acc + (s.lineTotal || 0),
        0
      );
      bookingTotals.tien_san =
        bookingTotals.tien_san === null
          ? Number(slotsSum.toFixed(2))
          : bookingTotals.tien_san;
      bookingTotals.tien_dich_vu =
        bookingTotals.tien_dich_vu === null
          ? Number(servicesSum.toFixed(2))
          : bookingTotals.tien_dich_vu;
      bookingTotals.tong_tien = Number(
        (bookingTotals.tien_san + bookingTotals.tien_dich_vu).toFixed(2)
      );
    }

    // Determine effective status: if booking still marked 'pending' but end time passed, expose as 'cancelled' in the response
    let effectiveStatus = result.trang_thai;
    let isExpired = false;
    try {
      // find latest end_time from slots
      const latestEnd = slots.reduce((m, s) => {
        if (!s || !s.end_time) return m;
        return m && m > s.end_time ? m : s.end_time;
      }, null);

      if (latestEnd) {
        // build a timestamp from ngay_su_dung + latestEnd (works when ngay_su_dung is a date string or Date)
        const datePart =
          result.ngay_su_dung instanceof Date
            ? result.ngay_su_dung.toISOString().slice(0, 10)
            : String(result.ngay_su_dung);
        const bookingEndTs = new Date(`${datePart}T${latestEnd}`);
        if (!isNaN(bookingEndTs.getTime())) {
          if (
            String(result.trang_thai) === 'pending' &&
            bookingEndTs.getTime() < Date.now()
          ) {
            effectiveStatus = 'cancelled';
            isExpired = true;
          }
        }
      }
    } catch (err) {
      // non-fatal: if parsing fails, just fall back to stored status
      console.warn(
        'Could not compute effective booking status:',
        err && err.message ? err.message : err
      );
    }

    // Return booking info along with an effective status and expiration flag so frontend can show immediately
    const bookingResponse = {
      booking: {
        ...result,
        effective_status: effectiveStatus,
        is_expired: isExpired,
      },
      slots,
      services: enrichedServices,
      totals: bookingTotals,
    };

    res.json(
      formatResponse(true, bookingResponse, 'Lấy thông tin đặt sân thành công')
    );
  } catch (error) {
    console.error('Get booking by token error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Cancel booking (public or admin)
const cancelBooking = async (req, res) => {
  try {
    // Accept route param as either :id (admin) or :token (public) and normalize
    const id = req.params.id || req.params.token;
    const { reason } = req.body;

    if (!id) {
      return res
        .status(400)
        .json(formatErrorResponse('Thiếu mã hoặc id đặt sân để hủy'));
    }
    const user = req.user; // may be undefined for public routes

    // Find booking by id or ma_pd
    const q = await PhieuDatSan.query(
      /^\d+$/.test(id)
        ? 'SELECT * FROM phieu_dat_san WHERE id = $1'
        : 'SELECT * FROM phieu_dat_san WHERE ma_pd = $1',
      [id]
    );
    const booking = q.rows[0];

    if (!booking) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    }

    // Authorization check
    const isOwner = user ? booking.user_id === user.id : false;
    const isAdminOrStaff = user
      ? ['manager', 'staff'].includes(user.role)
      : false;

    // If request is unauthenticated (public) then require the token match and allow cancel
    if (!user) {
      // For public cancel, `id` should be a token (ma_pd) and must match booking.ma_pd
      if (/^\d+$/.test(id) || String(booking.ma_pd) !== String(id)) {
        return res
          .status(403)
          .json(formatErrorResponse('Không có quyền hủy đặt sân này'));
      }
    } else {
      // Authenticated users require either ownership or admin/staff role
      if (!isAdminOrStaff && !isOwner) {
        return res
          .status(403)
          .json(formatErrorResponse('Không có quyền hủy đặt sân này'));
      }
    }

    if (booking.trang_thai === 'cancelled') {
      return res.status(400).json(formatErrorResponse('Đã hủy trước đó'));
    }

    // Customers can only cancel pending bookings
    if (!isAdminOrStaff && isOwner && booking.trang_thai !== 'pending') {
      return res
        .status(403)
        .json(
          formatErrorResponse('Chỉ có thể hủy các đặt sân đang chờ xác nhận')
        );
    }

    await PhieuDatSan.transaction(async (client) => {
      await client.query(
        'UPDATE phieu_dat_san SET trang_thai = $1 WHERE id = $2',
        ['cancelled', booking.id]
      );
      await client.query(
        'INSERT INTO phieu_huy_dat_san (phieu_dat_id, ly_do, nguoi_thuc_hien, tien_hoan) VALUES ($1,$2,$3,$4)',
        [booking.id, reason || null, user ? user.id : null, 0] // record who cancelled (null for public)
      );
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
    const {
      page = 1,
      limit = 10,
      search_name = '',
      search_phone = '',
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause for search
    let whereClause = '';
    const queryParams = [];
    let paramIndex = 1;

    if (search_name || search_phone) {
      const conditions = [];

      if (search_name) {
        conditions.push(`contact_name ILIKE $${paramIndex}`);
        queryParams.push(`%${search_name}%`);
        paramIndex++;
      }

      if (search_phone) {
        conditions.push(`contact_phone ILIKE $${paramIndex}`);
        queryParams.push(`%${search_phone}%`);
        paramIndex++;
      }

      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM phieu_dat_san ${whereClause}`;
    const countResult = await PhieuDatSan.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT * FROM phieu_dat_san 
      ${whereClause}
      ORDER BY ngay_tao DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const q = await PhieuDatSan.query(dataQuery, queryParams);

    const totalPages = Math.ceil(total / limit);

    res.json(
      formatResponse(
        true,
        {
          bookings: q.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        'Lấy danh sách đặt sân thành công'
      )
    );
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Customer: list own bookings
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const q = await PhieuDatSan.query(
      `SELECT * FROM phieu_dat_san WHERE user_id = $1 ORDER BY ngay_tao DESC`,
      [userId]
    );
    const bookings = q.rows;
    // attach slots for each booking
    for (const b of bookings) {
      const slotsQ = await ChiTietPhieuSan.query(
        'SELECT san_id, start_time, end_time, don_gia FROM chi_tiet_phieu_san WHERE phieu_dat_id = $1 ORDER BY start_time',
        [b.id]
      );
      b.slots = slotsQ.rows || [];
    }

    res.json(
      formatResponse(
        true,
        bookings,
        'Lấy lịch sử đặt sân của khách hàng thành công'
      )
    );
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Admin: booking detail
const getBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    let q;
    if (/^\d+$/.test(id)) {
      q = await PhieuDatSan.query('SELECT * FROM phieu_dat_san WHERE id = $1', [
        id,
      ]);
    } else {
      q = await PhieuDatSan.query(
        'SELECT * FROM phieu_dat_san WHERE ma_pd = $1',
        [id]
      );
    }
    const booking = q.rows[0];
    if (!booking)
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    const slots = await ChiTietPhieuSan.query(
      'SELECT * FROM chi_tiet_phieu_san WHERE phieu_dat_id = $1',
      [booking.id]
    );
    const services = await ChiTietPhieuDichVu.query(
      'SELECT * FROM chi_tiet_phieu_dich_vu WHERE phieu_dat_id = $1',
      [booking.id]
    );
    res.json(
      formatResponse(
        true,
        { booking, slots: slots.rows, services: services.rows },
        'Lấy chi tiết đặt sân thành công'
      )
    );
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
    const q = await PhieuDatSan.query(
      /^\d+$/.test(id)
        ? 'SELECT * FROM phieu_dat_san WHERE id = $1'
        : 'SELECT * FROM phieu_dat_san WHERE ma_pd = $1',
      [id]
    );
    const booking = q.rows[0];
    if (!booking)
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    if (booking.trang_thai !== 'pending')
      return res
        .status(400)
        .json(
          formatErrorResponse(
            'Chỉ có thể xác nhận phiếu đang ở trạng thái pending'
          )
        );
    await PhieuDatSan.query(
      'UPDATE phieu_dat_san SET trang_thai = $1 WHERE id = $2',
      ['confirmed', booking.id]
    );
    res.json(formatResponse(true, null, 'Xác nhận đặt sân thành công'));
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  createBooking,
  getBookings,
  getMyBookings,
  getBookingDetail,
  confirmBooking,
  cancelBooking,
  updateBooking,
  getBookingByToken,
};

// Admin: update booking (status/payment)
async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const { trang_thai, is_paid, payment_method, note } = req.body;

    const q = await PhieuDatSan.query(
      /^\d+$/.test(id)
        ? 'SELECT * FROM phieu_dat_san WHERE id = $1'
        : 'SELECT * FROM phieu_dat_san WHERE ma_pd = $1',
      [id]
    );
    const booking = q.rows[0];
    if (!booking) {
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy phiếu đặt'));
    }

    // Build update parts
    const updates = [];
    const params = [];
    let idx = 1;
    if (trang_thai !== undefined) {
      updates.push(`trang_thai = $${idx++}`);
      params.push(trang_thai);
    }
    if (is_paid !== undefined) {
      updates.push(`is_paid = $${idx++}`);
      params.push(is_paid);
    }
    if (payment_method !== undefined) {
      updates.push(`payment_method = $${idx++}`);
      params.push(payment_method);
    }
    if (note !== undefined) {
      updates.push(`note = $${idx++}`);
      params.push(note);
    }

    if (updates.length === 0) {
      return res.json(
        formatResponse(true, null, 'Không có trường nào được cập nhật')
      );
    }

    params.push(booking.id);
    const sql = `UPDATE phieu_dat_san SET ${updates.join(
      ', '
    )} WHERE id = $${idx}`;
    await PhieuDatSan.query(sql, params);

    res.json(formatResponse(true, null, 'Cập nhật đặt sân thành công'));
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
}
