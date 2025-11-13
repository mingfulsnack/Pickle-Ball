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
  BangGiaSan,
} = require('../models');

// Helper to render template with data
const renderTemplate = (templatePath, data) => {
  const tpl = fs.readFileSync(templatePath, 'utf8');
  const compiled = handlebars.compile(tpl);
  return compiled(data);
};

// Build invoice data from booking id
const buildInvoiceData = async (bookingId) => {
  const q = await PhieuDatSan.query(
    'SELECT * FROM phieu_dat_san WHERE id = $1',
    [bookingId]
  );
  const booking = q.rows[0];
  if (!booking) throw new Error('Không tìm thấy phiếu đặt');

  // fetch service lines
  const svcQ = await ChiTietPhieuDichVu.query(
    `SELECT ctpd.*, dv.ten_dv, dv.loai as dv_loai, dv.don_gia as dv_don_gia
     FROM chi_tiet_phieu_dich_vu ctpd
     LEFT JOIN dich_vu dv ON ctpd.dich_vu_id = dv.id
     WHERE ctpd.phieu_dat_id = $1`,
    [booking.id]
  );
  const services = svcQ.rows || [];

  // fetch court slots with court names and pricing
  const slotsQ = await ChiTietPhieuSan.query(
    `SELECT ctps.*, s.ten_san, s.ma_san
     FROM chi_tiet_phieu_san ctps
     LEFT JOIN san s ON ctps.san_id = s.id
     WHERE ctps.phieu_dat_id = $1
     ORDER BY s.ten_san, ctps.start_time`,
    [booking.id]
  );
  const slots = slotsQ.rows || [];

  const parseToMinutes = (t) => {
    if (!t) return 0;
    const parts = t.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  };

  // Calculate total hours for rent services
  const totalHours = slots.reduce((acc, s) => {
    const start = parseToMinutes(s.start_time);
    const end = parseToMinutes(s.end_time);
    const dur = Math.max(0, (end - start) / 60);
    return acc + dur;
  }, 0);

  // Group slots by court and calculate hours per court
  const courtHours = {};
  slots.forEach((slot) => {
    const courtKey = `${slot.san_id}-${slot.ten_san}`;
    if (!courtHours[courtKey]) {
      courtHours[courtKey] = {
        san_id: slot.san_id,
        ten_san: slot.ten_san || `Sân ${slot.san_id}`,
        ma_san: slot.ma_san,
        hours: 0,
        total_price: 0, // Use total price instead of hourly rate
      };
    }
    const start = parseToMinutes(slot.start_time);
    const end = parseToMinutes(slot.end_time);
    const dur = Math.max(0, (end - start) / 60);
    courtHours[courtKey].hours += dur;
    courtHours[courtKey].total_price += Number(slot.don_gia || 0);
  });

  const items = [];
  let itemIndex = 1;

  // Add court rental items
  Object.values(courtHours).forEach((court) => {
    if (court.hours > 0) {
      const avgPricePerHour = Math.round(court.total_price / court.hours);
      const displayQuantity =
        court.hours % 1 === 0 ? `${court.hours}` : `${court.hours.toFixed(1)}`;
      items.push({
        index: itemIndex++,
        ten_dv: court.ten_san,
        quantity: displayQuantity,
        don_gia: avgPricePerHour.toLocaleString('vi-VN') + 'đ',
        amount: court.total_price.toLocaleString('vi-VN') + 'đ',
        rawAmount: court.total_price,
      });
    }
  });

  // Add service items
  services.forEach((s) => {
    const ten_dv = s.ten_dv || s.ten_dich_vu || 'Dịch vụ';
    const loai = s.dv_loai || s.loai || 'buy';
    const don_gia =
      s.don_gia !== null && s.don_gia !== undefined
        ? Number(s.don_gia)
        : Number(s.dv_don_gia || 0);
    const so_luong = Number(s.so_luong || s.qty || 1);

    // For rent services: quantity = số lượng × số giờ
    // For buy services: quantity = số lượng only
    const quantity = loai === 'rent' ? so_luong * (totalHours || 1) : so_luong;
    const amount = Number((don_gia * quantity).toFixed(2));

    // Display quantity differently for rent vs buy services
    const displayQuantity =
      loai === 'rent' ? `${so_luong} × ${totalHours || 1}h` : `${so_luong}`;

    items.push({
      index: itemIndex++,
      ten_dv,
      quantity: displayQuantity,
      don_gia: don_gia.toLocaleString('vi-VN') + 'đ',
      amount: amount.toLocaleString('vi-VN') + 'đ',
      rawAmount: amount,
    });
  });

  const subtotal = items.reduce((acc, it) => acc + (it.rawAmount || 0), 0);

  const data = {
    invoiceNumber: booking.ma_pd || `PD${booking.id}`,
    ma_pd: booking.ma_pd || '',
    ngay_su_dung: booking.ngay_su_dung
      ? new Date(booking.ngay_su_dung).toLocaleDateString('vi-VN')
      : '',
    contact_name:
      booking.contact_name || booking.contact_snapshot?.contact_name || '',
    contact_phone:
      booking.contact_phone || booking.contact_snapshot?.contact_phone || '',
    items,
    subtotal: Number(subtotal).toLocaleString('vi-VN') + 'đ',
  };

  return data;
};

// Generate PDF using Puppeteer (no external binary required beyond npm install)
const generatePdfFromHtml = async (html) => {
  let browser;
  try {
    console.log('Starting PDF generation...');
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

    console.log('Browser launched successfully');
    const page = await browser.newPage();

    // Add a simple wait to ensure page is ready
    await page.setViewport({ width: 1200, height: 800 });

    // Set content directly without waiting for network
    console.log('Setting page content...');
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    // Add a small delay to ensure rendering is complete using setTimeout with Promise
    console.log('Waiting for rendering to complete...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('Content set, generating PDF...');
    // Generate PDF with simpler options
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

    // Verify buffer is not empty and looks like PDF
    if (!pdfBuffer || pdfBuffer.length < 100) {
      throw new Error('Generated PDF buffer is too small or empty');
    }

    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
};

const createInvoicePdf = async (req, res) => {
  try {
    const bookingId = req.query.bookingId || req.query.id;
    if (!bookingId)
      return res.status(400).json(formatErrorResponse('bookingId is required'));

    const data = await buildInvoiceData(bookingId);

    const templatePath = path.join(__dirname, '..', 'template', 'invoice.hbs');

    const html = renderTemplate(templatePath, data);

    const pdfBuffer = await generatePdfFromHtml(html);

    // Validate that we got a proper PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Failed to generate PDF - empty buffer');
    }

    // Check if the buffer starts with PDF signature (but be more lenient)
    const header = pdfBuffer.toString('utf8', 0, 10);

    // Look for PDF signature anywhere in the first 100 bytes
    const firstChunk = pdfBuffer.toString(
      'utf8',
      0,
      Math.min(100, pdfBuffer.length)
    );

    if (!firstChunk.includes('%PDF')) {
      // Try to save the buffer to a file for debugging
      const fs = require('fs');

      try {
        fs.writeFileSync(debugPath, pdfBuffer);
      } catch (writeError) {
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice_${data.invoiceNumber}.pdf"`
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Create invoice error:', error);
    res
      .status(500)
      .json(formatErrorResponse(error.message || 'Lỗi khi tạo hóa đơn'));
  }
};

module.exports = {
  createInvoicePdf,
  buildInvoiceData, // Export for testing
};
