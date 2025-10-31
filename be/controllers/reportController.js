const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');
const {
  PhieuDatSan,
  ChiTietPhieuDichVu,
  ChiTietPhieuSan,
  San,
  DichVu,
} = require('../models');

// Helper to render template with data
const renderTemplate = (templatePath, data) => {
  const tpl = fs.readFileSync(templatePath, 'utf8');
  const compiled = handlebars.compile(tpl);
  return compiled(data);
};

// Generate PDF using Puppeteer
const generatePdfFromHtml = async (html) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
      ],
      headless: true,
      timeout: 30000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pdfBuffer = await page.pdf({
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm',
      },
      preferCSSPageSize: true,
      scale: 1,
      timeout: 30000,
    });

    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
};

// Service Revenue Report
const generateServiceRevenueReport = async (startDate, endDate) => {
  const servicesQuery = await ChiTietPhieuDichVu.query(
    `
    SELECT 
      dv.ten_dv,
      dv.don_gia,
      dv.loai,
      SUM(
        CASE 
          WHEN dv.loai = 'rent' THEN 
            ROUND(COALESCE(
              (
                SELECT SUM(EXTRACT(EPOCH FROM (ctps.end_time::time - ctps.start_time::time)) / 3600)
                FROM chi_tiet_phieu_san ctps 
                WHERE ctps.phieu_dat_id = ctpd.phieu_dat_id
              ), 1
            ))
          ELSE ctpd.so_luong 
        END
      ) as total_quantity,
      COUNT(ctpd.id) as booking_count,
      SUM(
        CASE 
          WHEN dv.loai = 'rent' THEN 
            ctpd.so_luong * dv.don_gia * COALESCE(
              (
                SELECT SUM(EXTRACT(EPOCH FROM (ctps.end_time::time - ctps.start_time::time)) / 3600)
                FROM chi_tiet_phieu_san ctps 
                WHERE ctps.phieu_dat_id = ctpd.phieu_dat_id
              ), 1
            )
          ELSE ctpd.so_luong * ctpd.don_gia
        END
      ) as tong_doanh_thu
    FROM chi_tiet_phieu_dich_vu ctpd
    LEFT JOIN dich_vu dv ON ctpd.dich_vu_id = dv.id
    LEFT JOIN phieu_dat_san pds ON ctpd.phieu_dat_id = pds.id
    WHERE pds.ngay_su_dung BETWEEN $1 AND $2
      AND pds.trang_thai = 'confirmed'
      AND pds.is_paid = true
    GROUP BY dv.id, dv.ten_dv, dv.don_gia, dv.loai
    ORDER BY tong_doanh_thu DESC
  `,
    [startDate, endDate]
  );

  const services = servicesQuery.rows || [];
  const totalRevenue = services.reduce(
    (sum, service) => sum + Number(service.tong_doanh_thu),
    0
  );
  const totalRentQuantity = services.reduce(
    (sum, service) =>
      sum + (service.loai === 'rent' ? Number(service.total_quantity) : 0),
    0
  );
  const totalBuyCount = services.reduce(
    (sum, service) =>
      sum + (service.loai === 'buy' ? Number(service.booking_count) : 0),
    0
  );

  return {
    title: 'BÁO CÁO DOANH THU DỊCH VỤ',
    startDate,
    endDate,
    items: services.map((service, index) => ({
      index: index + 1,
      ten_dich_vu: service.ten_dv,
      don_gia: Number(service.don_gia).toLocaleString('vi-VN'),
      so_luong_thue:
        service.loai === 'rent'
          ? Math.round(Number(service.total_quantity))
          : 0,
      so_luot_dat_dich_vu:
        service.loai === 'buy' ? Number(service.booking_count) : 0,
      tong_doanh_thu: Number(service.tong_doanh_thu).toLocaleString('vi-VN'),
    })),
    totalRentQuantity: Math.round(totalRentQuantity),
    totalBuyCount,
    totalRevenue: totalRevenue.toLocaleString('vi-VN'),
  };
};

// Booking Details Report
const generateBookingDetailsReport = async (startDate, endDate) => {
  const bookingsQuery = await PhieuDatSan.query(
    `
    SELECT 
      pds.ma_pd,
      pds.contact_name,
      pds.ngay_su_dung,
      pds.tong_tien - COALESCE(service_total.tong_dich_vu, 0) as tien_san,
      COALESCE(service_total.tong_dich_vu, 0) as tien_dich_vu,
      pds.tong_tien
    FROM phieu_dat_san pds
    LEFT JOIN (
      SELECT 
        phieu_dat_id,
        SUM(so_luong * don_gia) as tong_dich_vu
      FROM chi_tiet_phieu_dich_vu
      GROUP BY phieu_dat_id
    ) service_total ON pds.id = service_total.phieu_dat_id
    WHERE pds.ngay_su_dung BETWEEN $1 AND $2
      AND pds.trang_thai = 'confirmed'
      AND pds.is_paid = true
    ORDER BY pds.ngay_su_dung DESC
  `,
    [startDate, endDate]
  );

  const bookings = bookingsQuery.rows || [];
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + Number(booking.tong_tien),
    0
  );

  return {
    title: 'BÁO CÁO CHI TIẾT PHIẾU ĐẶT SÂN',
    startDate,
    endDate,
    items: bookings.map((booking) => ({
      ma_phieu_dat: booking.ma_pd,
      ten_khach_hang: booking.contact_name,
      ngay_den: new Date(booking.ngay_su_dung).toLocaleDateString('vi-VN'),
      tien_san: Number(booking.tien_san).toLocaleString('vi-VN'),
      tien_dich_vu: Number(booking.tien_dich_vu).toLocaleString('vi-VN'),
      tong_tien: Number(booking.tong_tien).toLocaleString('vi-VN'),
    })),
    totalRevenue: totalRevenue.toLocaleString('vi-VN'),
  };
};

// Court Revenue Report
const generateCourtRevenueReport = async (startDate, endDate) => {
  const courtsQuery = await ChiTietPhieuSan.query(
    `
    SELECT 
      s.ten_san,
      COUNT(ctps.id) as so_lan_dat,
      SUM(ctps.don_gia) as tong_doanh_thu
    FROM chi_tiet_phieu_san ctps
    LEFT JOIN san s ON ctps.san_id = s.id
    LEFT JOIN phieu_dat_san pds ON ctps.phieu_dat_id = pds.id
    WHERE pds.ngay_su_dung BETWEEN $1 AND $2
      AND pds.is_paid = true
    GROUP BY s.id, s.ten_san
    ORDER BY tong_doanh_thu DESC
  `,
    [startDate, endDate]
  );

  const courts = courtsQuery.rows || [];
  const totalBookings = courts.reduce(
    (sum, court) => sum + Number(court.so_lan_dat),
    0
  );
  const totalRevenue = courts.reduce(
    (sum, court) => sum + Number(court.tong_doanh_thu),
    0
  );

  return {
    title: 'BÁO CÁO DOANH THU THEO SÂN',
    startDate,
    endDate,
    items: courts.map((court, index) => ({
      index: index + 1,
      ten_san: court.ten_san,
      so_lan_dat: court.so_lan_dat,
      tong_doanh_thu: Number(court.tong_doanh_thu).toLocaleString('vi-VN'),
    })),
    totalBookings,
    totalRevenue: totalRevenue.toLocaleString('vi-VN'),
  };
};

// Customer Revenue Report
const generateCustomerRevenueReport = async (startDate, endDate) => {
  const customersQuery = await PhieuDatSan.query(
    `
    SELECT 
      pds.contact_name as ten_khach_hang,
      COUNT(pds.id) as so_lan_dat,
      SUM(pds.tong_tien - COALESCE(service_total.tong_dich_vu, 0)) as tien_san,
      SUM(COALESCE(service_total.tong_dich_vu, 0)) as tien_dich_vu,
      SUM(pds.tong_tien) as tong_doanh_thu
    FROM phieu_dat_san pds
    LEFT JOIN (
      SELECT 
        phieu_dat_id,
        SUM(so_luong * don_gia) as tong_dich_vu
      FROM chi_tiet_phieu_dich_vu
      GROUP BY phieu_dat_id
    ) service_total ON pds.id = service_total.phieu_dat_id
    WHERE pds.ngay_su_dung BETWEEN $1 AND $2
      AND pds.trang_thai = 'confirmed'
      AND pds.is_paid = true
    GROUP BY pds.contact_name
    ORDER BY tong_doanh_thu DESC
  `,
    [startDate, endDate]
  );

  const customers = customersQuery.rows || [];
  const totalBookings = customers.reduce(
    (sum, customer) => sum + Number(customer.so_lan_dat),
    0
  );
  const totalCourtRevenue = customers.reduce(
    (sum, customer) => sum + Number(customer.tien_san),
    0
  );
  const totalServiceRevenue = customers.reduce(
    (sum, customer) => sum + Number(customer.tien_dich_vu),
    0
  );
  const totalRevenue = customers.reduce(
    (sum, customer) => sum + Number(customer.tong_doanh_thu),
    0
  );

  return {
    title: 'BÁO CÁO DOANH THU THEO KHÁCH HÀNG',
    startDate,
    endDate,
    items: customers.map((customer, index) => ({
      index: index + 1,
      ten_khach_hang: customer.ten_khach_hang,
      so_lan_dat: customer.so_lan_dat,
      tien_san: Number(customer.tien_san).toLocaleString('vi-VN'),
      tien_dich_vu: Number(customer.tien_dich_vu).toLocaleString('vi-VN'),
      tong_doanh_thu: Number(customer.tong_doanh_thu).toLocaleString('vi-VN'),
    })),
    totalBookings,
    totalCourtRevenue: totalCourtRevenue.toLocaleString('vi-VN'),
    totalServiceRevenue: totalServiceRevenue.toLocaleString('vi-VN'),
    totalRevenue: totalRevenue.toLocaleString('vi-VN'),
  };
};

// Main generate report function
const generateReport = async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;

    if (!type || !start_date || !end_date) {
      return res
        .status(400)
        .json(formatErrorResponse('Missing required parameters'));
    }

    let reportData;
    let templateName;

    switch (type) {
      case 'service_revenue':
        reportData = await generateServiceRevenueReport(start_date, end_date);
        templateName = 'service-revenue-report.hbs';
        break;
      case 'booking_details':
        reportData = await generateBookingDetailsReport(start_date, end_date);
        templateName = 'booking_details_report.hbs';
        break;
      case 'court_revenue':
        reportData = await generateCourtRevenueReport(start_date, end_date);
        templateName = 'court_revenue_report.hbs';
        break;
      case 'customer_revenue':
        reportData = await generateCustomerRevenueReport(start_date, end_date);
        templateName = 'customer_revenue_report.hbs';
        break;
      default:
        return res.status(400).json(formatErrorResponse('Invalid report type'));
    }

    const templatePath = path.join(__dirname, '..', 'template', templateName);
    const html = renderTemplate(templatePath, reportData);
    const pdfBuffer = await generatePdfFromHtml(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Report_${type}_${start_date}_${end_date}.pdf"`
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Generate report error:', error);
    res
      .status(500)
      .json(formatErrorResponse(error.message || 'Lỗi khi tạo báo cáo'));
  }
};

module.exports = {
  generateReport,
};
