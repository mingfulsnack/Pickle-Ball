import React, { useState } from 'react';
import { publicApi } from '../../services/api';
import './BookingLookup.scss';

const BookingLookup = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!code.trim()) {
      setError('Vui lòng nhập mã đặt sân (ma_pd)');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await publicApi.get(`/public/bookings/${encodeURIComponent(code.trim())}`);
      if (res.data && res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data?.message || 'Không tìm thấy đặt sân');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Lỗi khi truy vấn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-lookup-page">
      <div className="lookup-container">
        <h1>Tra cứu đặt sân</h1>
        <p>Nhập mã đặt sân để kiểm tra trạng thái và chi tiết.</p>

        <div className="lookup-form">
          <input
            type="text"
            placeholder="Nhập mã đặt sân, ví dụ PD24100712345"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? 'Đang tra cứu...' : 'Tra cứu'}
          </button>
        </div>

        {error && <div className="lookup-error">{error}</div>}

        {result && (
          <div className="lookup-result">
            <h2>Kết quả</h2>
            <div className="booking-info">
              <div className="row">
                <div className="label">Mã đặt sân</div>
                <div className="value">{result.booking?.ma_pd}</div>
              </div>
              <div className="row">
                <div className="label">Ngày sử dụng</div>
                <div className="value">{result.booking?.ngay_su_dung}</div>
              </div>
              <div className="row">
                <div className="label">Trạng thái</div>
                <div className="value">{result.booking?.trang_thai}</div>
              </div>
              <div className="row">
                <div className="label">Phương thức thanh toán</div>
                <div className="value">{result.booking?.payment_method}</div>
              </div>
              <div className="row">
                <div className="label">Tiền sân</div>
                <div className="value">{result.totals?.tien_san ? Number(result.totals.tien_san).toLocaleString() + 'đ' : (result.total ? Number(result.total).toLocaleString() + 'đ' : '-')}</div>
              </div>
              <div className="row">
                <div className="label">Tiền dịch vụ</div>
                <div className="value">{result.totals?.tien_dich_vu ? Number(result.totals.tien_dich_vu).toLocaleString() + 'đ' : '-'}</div>
              </div>
              <div className="row">
                <div className="label">Tổng</div>
                <div className="value">{result.totals?.tong_tien ? Number(result.totals.tong_tien).toLocaleString() + 'đ' : (result.total ? Number(result.total).toLocaleString() + 'đ' : '-')}</div>
              </div>

              <h3>Khung giờ</h3>
              <div className="slots">
                {result.slots?.map((s, idx) => (
                  <div key={idx} className="slot-item">
                    <div>{s.ma_san ? `${s.ma_san} - ${s.ten_san}` : `Sân ${s.san_id}`}</div>
                    <div>{s.start_time} - {s.end_time}</div>
                    <div>Giá: {s.don_gia ? Number(s.don_gia).toLocaleString() + 'đ' : (s.slotTotal ? s.slotTotal.toLocaleString() + 'đ' : '-')}</div>
                  </div>
                ))}
              </div>

              {result.services && result.services.length > 0 && (
                <>
                  <h3>Dịch vụ</h3>
                  <div className="services-list">
                    {result.services.map((sv, i) => (
                      <div key={i} className="service-item">
                        <div>{sv.dv?.ten_dv || sv.ten_dv || 'Dịch vụ'}</div>
                        <div>Số lượng: {sv.qty || sv.so_luong}</div>
                        <div>Thành tiền: {sv.lineTotal ? sv.lineTotal.toLocaleString() + 'đ' : (sv.price ? sv.price.toLocaleString() + 'đ' : '-')}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingLookup;
