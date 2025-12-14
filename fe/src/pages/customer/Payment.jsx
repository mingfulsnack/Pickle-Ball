import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/api';
import './Payment.scss';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  const {
    booking,
    token,
    pricing,
    bookingData,
    searchParams,
    selectedContact,
    selectedSlots,
    selectedServices,
    paymentMethod,
  } = location.state || {};

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      alert('Phiên thanh toán đã hết hạn. Vui lòng đặt sân lại.');
      navigate('/booking');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  };

  const { minutes, seconds } = formatTime(timeLeft);

  // If neither a created booking nor bookingData is provided, redirect home
  if (!booking && !bookingData) {
    navigate('/');
    return null;
  }

  const handleConfirmPayment = async () => {
    setLoading(true);

    try {
      // If booking already exists (older flow), just proceed
      if (booking) {
        // simulate a short delay for UX parity
        setTimeout(() => {
          navigate('/booking-confirmation', {
            state: {
              booking: booking,
              token: token,
              paid: true,
            },
          });
        }, 800);
        return;
      }

      // Deferred booking creation: post bookingData now
      if (!bookingData) {
        alert('Dữ liệu đặt sân không hợp lệ. Vui lòng quay lại và thử lại.');
        setLoading(false);
        return;
      }

      const response = await publicApi.post('/public/bookings', bookingData);
      if (response.data && response.data.success) {
        const created = response.data.data;
        const bookingToken = created.booking?.ma_pd;
        navigate('/booking-confirmation', {
          state: { booking: created, token: bookingToken, paid: true },
        });
        return;
      }

      // If server returned an unsuccessful response
      alert(response.data?.message || 'Không thể tạo đơn đặt sân.');
    } catch (error) {
      console.error('Error confirming payment / creating booking:', error);
      const serverMsg = error?.response?.data?.message;
      if (serverMsg) {
        alert(`Lỗi: ${serverMsg}`);
      } else {
        alert('Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToBooking = () => {
    // Navigate back to booking page preserving the user's selections
    navigate('/booking', {
      state: {
        searchParams: searchParams,
        selectedContact: selectedContact,
        selectedSlots: selectedSlots,
        selectedServices: selectedServices,
        paymentMethod: paymentMethod || 'bank_transfer',
        pricing: pricing,
      },
    });
  };

  const totalAmount =
    pricing?.summary?.grand_total ||
    booking?.booking?.tong_tien ||
    bookingData?.total ||
    0;

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <button className="payment-back" onClick={handleBackToBooking}>
            ← Quay lại
          </button>
          <h1>Thanh toán đơn đặt sân</h1>
          <div className="countdown-timer">
            <span>Giao dịch hết hạn sau</span>
            <div className="timer">
              <span className="time-digit">{minutes}</span>
              <span className="time-separator">:</span>
              <span className="time-digit">{seconds}</span>
            </div>
          </div>
        </div>

        <div className="payment-content">
          <div className="payment-left">
            <div className="warning-notice">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                Quý khách vui lòng không tắt trình duyệt cho đến khi nhận được
                kết quả giao dịch từ website. Trường hợp đã thanh toán nhưng
                không nhận được kết quả giao dịch liên hệ lại hotline 1900 1508
              </div>
            </div>

            <div className="order-info">
              <h3>Thông tin đơn hàng</h3>
              <div className="info-row">
                <span className="label">Số tiền thanh toán</span>
                <span className="value">
                  {totalAmount.toLocaleString()} VNĐ
                </span>
              </div>
              <div className="info-row">
                <span className="label">Thông tin đơn hàng</span>
                <div className="order-details">
                  <div>Thuê sân: {booking?.booking?.ngay_su_dung || 'N/A'}</div>
                  <div>Thời gian: 9:00 → 11:00</div>
                  <div>Thuê vợt</div>
                  <div>Thuê bóng</div>
                </div>
              </div>
              <div className="info-row">
                <span className="label">Mã đơn hàng</span>
                <span className="value">
                  {token || 'IDHS029348023984O2394'}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Nhà cung cấp</span>
                <span className="value">
                  CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ PHÁT TRIỂN HOOLSOFT
                </span>
              </div>
            </div>
          </div>

          <div className="payment-right">
            <div className="qr-section">
              <h3>Quét mã qua App Ngân Hàng/ Ví điện tử</h3>
              <div className="qr-code">
                <img
                  src="https://www.qr-code-generator.com/wp-content/themes/qr/new_structure/assets/media/images/solutions/epc/QRCode.png"
                  alt="QR Code"
                  className="qr-image"
                />
              </div>
            </div>

            <button
              className="confirm-payment-btn"
              onClick={handleConfirmPayment}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </div>

        <div className="bank-logos">
          <h4>Danh sách Ngân hàng/ Ví điện tử có thể thanh toán</h4>
          <div className="logos-grid">
            <div className="bank-logo">Vietcombank</div>
            <div className="bank-logo">BIDV</div>
            <div className="bank-logo">VietinBank</div>
            <div className="bank-logo">Agribank</div>
            <div className="bank-logo">Momo</div>
            <div className="bank-logo">ZaloPay</div>
            <div className="bank-logo">MB Bank</div>
            <div className="bank-logo">SCB</div>
            <div className="bank-logo">TPBank</div>
            <div className="bank-logo">VPBank</div>
            <div className="bank-logo">OCB</div>
            <div className="bank-logo">Sacombank</div>
            <div className="bank-logo">SeABank</div>
            <div className="bank-logo">Techcombank</div>
            <div className="bank-logo">HDBank</div>
            <div className="bank-logo">ACB</div>
            <div className="bank-logo">VIB</div>
            <div className="bank-logo">SHB</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
