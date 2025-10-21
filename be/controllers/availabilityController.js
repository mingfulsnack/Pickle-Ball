const { San, PhieuDatSan, BangGiaSan } = require('../models');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Kiểm tra tình trạng sân trống theo ngày
const getAvailability = async (req, res) => {
  try {
    const { date, start_time, end_time } = req.query;

    if (!date) {
      return res.status(400).json(formatErrorResponse('Thiếu ngày kiểm tra'));
    }

    // Lấy tất cả sân
    const courts = await San.findAll({ activeOnly: true });

    const availability = [];

    for (const court of courts) {
      let isAvailable = true;
      let conflictDetails = null;

      if (start_time && end_time) {
        // Kiểm tra khung giờ cụ thể
        const checkResult = await San.query(
          `SELECT is_court_available($1, $2::date, $3::time, $4::time) as available`,
          [court.id, date, start_time, end_time]
        );
        isAvailable = checkResult.rows[0].available;
        console.debug(
          `Checked availability court=${court.id} date=${date} start=${start_time} end=${end_time} => available=${isAvailable}`
        );

        if (!isAvailable) {
          // Lấy thông tin booking xung đột
          const conflicts = await San.query(
            `SELECT pds.ma_pd, ctps.start_time, ctps.end_time, pds.trang_thai
             FROM phieu_dat_san pds
             JOIN chi_tiet_phieu_san ctps ON pds.id = ctps.phieu_dat_id
             WHERE ctps.san_id = $1 AND pds.ngay_su_dung = $2
               AND pds.trang_thai NOT IN ('cancelled')
               AND NOT (ctps.end_time <= $3::time OR ctps.start_time >= $4::time)`,
            [court.id, date, start_time, end_time]
          );
          conflictDetails = conflicts.rows;
        }
      } else {
        // Kiểm tra cả ngày - lấy tất cả booking trong ngày
        const dayBookings = await San.query(
          `SELECT ctps.start_time, ctps.end_time, pds.trang_thai
           FROM phieu_dat_san pds
           JOIN chi_tiet_phieu_san ctps ON pds.id = ctps.phieu_dat_id
           WHERE ctps.san_id = $1 AND pds.ngay_su_dung = $2
             AND pds.trang_thai NOT IN ('cancelled')
           ORDER BY ctps.start_time`,
          [court.id, date]
        );

        conflictDetails = dayBookings.rows;
        isAvailable = dayBookings.rows.length === 0;
      }

      availability.push({
        san_id: court.id,
        ma_san: court.ma_san,
        ten_san: court.ten_san,
        suc_chua: court.suc_chua,
        is_available: isAvailable,
        bookings: conflictDetails || [],
      });
    }

    res.json(
      formatResponse(true, availability, 'Kiểm tra tình trạng sân thành công')
    );
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Lấy khung giờ trống của một sân trong ngày
const getCourtAvailableSlots = async (req, res) => {
  try {
    const { san_id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json(formatErrorResponse('Thiếu ngày kiểm tra'));
    }

    // Kiểm tra sân có tồn tại
    const court = await San.findById(san_id);
    if (!court) {
      return res.status(404).json(formatErrorResponse('Không tìm thấy sân'));
    }

    // Lấy tất cả booking trong ngày
    const bookedSlots = await San.query(
      `SELECT ctps.start_time, ctps.end_time
       FROM phieu_dat_san pds
       JOIN chi_tiet_phieu_san ctps ON pds.id = ctps.phieu_dat_id
       WHERE ctps.san_id = $1 AND pds.ngay_su_dung = $2
         AND pds.trang_thai NOT IN ('cancelled')
       ORDER BY ctps.start_time`,
      [san_id, date]
    );

    // Tạo danh sách khung giờ có thể (từ 6:00 đến 23:00)
    const allSlots = [];
    for (let hour = 6; hour < 23; hour++) {
      const start = `${hour.toString().padStart(2, '0')}:00`;
      const end = `${(hour + 1).toString().padStart(2, '0')}:00`;

      // Kiểm tra xem khung giờ này có bị trùng không
      const isBooked = bookedSlots.rows.some((booking) => {
        const bookingStart = booking.start_time;
        const bookingEnd = booking.end_time;
        return !(end <= bookingStart || start >= bookingEnd);
      });

      allSlots.push({
        start_time: start,
        end_time: end,
        is_available: !isBooked,
      });
    }

    res.json(
      formatResponse(
        true,
        {
          san_id: parseInt(san_id),
          ma_san: court.ma_san,
          ten_san: court.ten_san,
          date,
          slots: allSlots,
          booked_slots: bookedSlots.rows,
        },
        'Lấy khung giờ trống thành công'
      )
    );
  } catch (error) {
    console.error('Get court available slots error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

// Tính giá cho một booking trước khi tạo
const calculatePrice = async (req, res) => {
  try {
    const { ngay_su_dung, slots, services = [] } = req.body;

    if (!ngay_su_dung || !Array.isArray(slots) || slots.length === 0) {
      return res
        .status(400)
        .json(formatErrorResponse('Thiếu thông tin ngày và khung giờ'));
    }

    const calculations = [];
    let totalSlotsPrice = 0;

    // Tính giá từng slot
    for (const slot of slots) {
      const { san_id, start_time, end_time } = slot;

      // Kiểm tra availability
      const availResult = await San.query(
        `SELECT is_court_available($1, $2::date, $3::time, $4::time) as available`,
        [san_id, ngay_su_dung, start_time, end_time]
      );

      if (!availResult.rows[0].available) {
        return res
          .status(409)
          .json(
            formatErrorResponse(
              `Sân ${san_id} không trống trong khung ${start_time}-${end_time}`
            )
          );
      }

      // Tính giá
      let slotPrice = 0;
      try {
        const priceResult = await BangGiaSan.calcTotalPriceForSlot(
          san_id,
          ngay_su_dung,
          start_time,
          end_time
        );
        slotPrice = parseFloat(priceResult || 0);
      } catch (err) {
        // If price calculation fails due to shift coverage, return a 400 to the client
        console.warn('Price calc validation error:', err.message || err);
        return res.status(400).json(formatErrorResponse(err.message || 'Validation error'));
      }
      totalSlotsPrice += slotPrice;

      calculations.push({
        san_id,
        start_time,
        end_time,
        price: slotPrice,
      });
    }

    // Tính tổng giờ để tính dịch vụ thuê
    const totalHours = slots.reduce((acc, slot) => {
      const startHour = parseInt(slot.start_time.split(':')[0]);
      const endHour = parseInt(slot.end_time.split(':')[0]);
      return acc + (endHour - startHour);
    }, 0);

    // Tính giá dịch vụ
    let totalServicesPrice = 0;
    const serviceCalculations = [];

    for (const service of services) {
      const { dich_vu_id, so_luong = 1 } = service;

      const serviceQuery = await San.query(
        'SELECT * FROM dich_vu WHERE id = $1',
        [dich_vu_id]
      );
      const serviceInfo = serviceQuery.rows[0];

      if (!serviceInfo) {
        return res
          .status(404)
          .json(formatErrorResponse(`Không tìm thấy dịch vụ ${dich_vu_id}`));
      }

      let servicePrice = 0;
      if (serviceInfo.loai === 'rent') {
        servicePrice = parseFloat(serviceInfo.don_gia) * so_luong * totalHours;
      } else {
        servicePrice = parseFloat(serviceInfo.don_gia) * so_luong;
      }

      totalServicesPrice += servicePrice;
      serviceCalculations.push({
        dich_vu_id,
        ten_dv: serviceInfo.ten_dv,
        loai: serviceInfo.loai,
        don_gia: parseFloat(serviceInfo.don_gia),
        so_luong,
        total_hours: serviceInfo.loai === 'rent' ? totalHours : 1,
        price: servicePrice,
      });
    }

    const grandTotal = totalSlotsPrice + totalServicesPrice;

    res.json(
      formatResponse(
        true,
        {
          ngay_su_dung,
          total_hours: totalHours,
          slots: calculations,
          services: serviceCalculations,
          summary: {
            slots_total: totalSlotsPrice,
            services_total: totalServicesPrice,
            grand_total: grandTotal,
          },
        },
        'Tính giá thành công'
      )
    );
  } catch (error) {
    console.error('Calculate price error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getAvailability,
  getCourtAvailableSlots,
  calculatePrice,
};
