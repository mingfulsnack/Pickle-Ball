import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BookingConfirmation.scss';

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const booking =
    location.state?.booking?.booking || location.state?.booking || null;
  const token = location.state?.token || booking?.ma_pd || '';

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="booking-confirmation">
      <div className="confirmation-card">
        <div className="checkmark">✅</div>
        <h1>Tạo đơn hàng thành công</h1>
        <p className="description">
          Đơn hàng đã thực hiện thành công. Quý khách vui lòng đến sân trước 10
          phút để thực hiện thủ tục check-in và thanh toán tiền mặt
        </p>

        <div className="booking-code">
          Mã đặt sân <span className="code">{token ? `#${token}` : '---'}</span>
        </div>

        <div className="actions">
          <button className="back-home" onClick={handleBackHome}>
            Quay lại trang chủ
          </button>
          <button
            className="copy-code"
            onClick={() => {
              if (token) {
                navigator.clipboard.writeText(token);
                alert('Đã sao chép mã đặt sân');
              }
            }}
          >
            Sao chép mã
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
