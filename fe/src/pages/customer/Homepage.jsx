import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.scss';
import { publicApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import appleImg from '../../assets/apple.png';
import pickleballImg from '../../assets/pickleball.png';

const Homepage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookingForm, setBookingForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [courts, setCourts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourts();
    fetchServices();
  }, []);

  const fetchCourts = async () => {
    try {
      const response = await publicApi.get('/public/courts?activeOnly=true');
      setCourts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await publicApi.get('/public/services');
      setServices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async () => {
    if (!bookingForm.date || !bookingForm.startTime || !bookingForm.endTime) {
      alert('Vui lòng chọn đầy đủ thông tin');
      return;
    }

    // Check if user is authenticated before proceeding
    if (!isAuthenticated()) {
      navigate('/login', {
        state: { redirectTo: '/booking' },
      });
      return;
    }

    setLoading(true);
    try {
      const response = await publicApi.get('/public/availability', {
        params: {
          date: bookingForm.date,
          start_time: bookingForm.startTime,
          end_time: bookingForm.endTime,
        },
      });

      // Navigate to booking page with search results
      navigate('/booking', {
        state: {
          availability: response.data.data,
          searchParams: bookingForm,
        },
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      alert('Có lỗi xảy ra khi kiểm tra tình trạng sân');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    // Check if user is authenticated, if not redirect to login
    if (!isAuthenticated()) {
      navigate('/login', {
        state: { redirectTo: '/booking' },
      });
    } else {
      navigate('/booking');
    }
  };

  // Generate time options (6:00 AM to 10:00 PM)
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    timeOptions.push(time);
  }

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-left">
            <div className="feature-badge">
              <img src={appleImg} alt="Apple" className="logo-icon" />
              <span>Easy court rentals</span>
            </div>
            <h1 className="hero-title">
              Thuê sân pickleball ngay chỉ trong vài giây
            </h1>
            <p className="hero-description">
              Real-time availability, flexible time slots, and hassle-free
              management. Book your racquet and play today!
            </p>
            <button className="cta-button" onClick={handleBookNow}>
              Đặt ngay
            </button>
          </div>
          <div className="hero-right">
            <div className="hero-image">
              <img
                src="/src/assets/pickleball-court.jpg"
                alt="Sân pickleball"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="image-placeholder" style={{ display: 'none' }}>
                <img
                  src={pickleballImg}
                  alt="Sân Pickleball"
                  className="placeholder-court-image"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="features-section">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Sân có sẵn</h3>
            <p>Có thể xem các sân có sẵn và thực hiện đặt sân ngay</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>Giờ chơi linh hoạt</h3>
            <p>Khách hàng có thể chọn giờ chơi theo ý muốn</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Ưu đãi đặc biệt</h3>
            <p>Ưu đãi giá sân vào các ngày thường</p>
          </div>
        </div>
      </section>

      {/* Booking Search Bar */}
      <section className="search-section">
        <div className="search-container">
          <div className="search-form">
            <div className="form-group">
              <label>📅 Chọn ngày</label>
              <input
                type="date"
                name="date"
                value={bookingForm.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Giờ bắt đầu</label>
              <select
                name="startTime"
                value={bookingForm.startTime}
                onChange={handleInputChange}
              >
                <option value="">Chọn giờ</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Giờ kết thúc</label>
              <select
                name="endTime"
                value={bookingForm.endTime}
                onChange={handleInputChange}
              >
                <option value="">Chọn giờ</option>
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="search-button"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '🔄' : '🔍'} Tìm kiếm
            </button>
          </div>
        </div>
      </section>

      {/* Customer Services */}
      <section className="services-section">
        <div className="services-container">
          <h2 className="section-title">Dịch vụ khách hàng</h2>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-image">
                <div className="placeholder-image">
                  <span>⏰</span>
                </div>
              </div>
              <h3>Đáp ứng mọi khung giờ</h3>
              <p>
                Pickleball Bồ Đề cung cấp tới khách hàng các khung giờ đẹp và
                hợp lý. Tổng đài của chúng tôi luôn sẵn sàng hỗ trợ khách hàng,
                mang lại sự tiện lợi và thoải mái cho khách hàng trong quá trình
                sử dụng dịch vụ.
              </p>
              <ul className="service-features">
                <li>Mở cửa từ 6h sáng đến 10h tối</li>
                <li>Đặt sân trực tuyến 24/7</li>
                <li>Xác nhận đặt sân tức thì</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-image">
                <div className="placeholder-image">
                  <span>🏆</span>
                </div>
              </div>
              <h3>Tiện ích cao cấp</h3>
              <p>
                Hệ thống sân được trang bị đầy đủ tiện nghi hiện đại, từ thiết
                bị cho thuê đến dịch vụ hỗ trợ chuyên nghiệp. Mang đến trải
                nghiệm chơi tốt nhất cho khách hàng.
              </p>
              <ul className="service-features">
                <li>Thiết bị cho thuê chất lượng cao</li>
                <li>Sân tiêu chuẩn quốc tế</li>
                <li>Hệ thống chiếu sáng LED</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-image">
                <div className="placeholder-image">
                  <span>💎</span>
                </div>
              </div>
              <h3>Đẳng cấp dịch vụ</h3>
              <p>
                Đội ngũ nhân viên phục vụ chuyên nghiệp. Pickleball Bồ Đề luôn
                đặt chất lượng dịch vụ lên hàng đầu với khẩu hiệu “Chất lượng là
                danh dự”.
              </p>
              <ul className="service-features">
                <li>Nhân viên hỗ trợ 24/7</li>
                <li>Chính sách hoàn tiền linh hoạt</li>
                <li>Chương trình khách hàng thân thiết</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section (Optional) */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">{courts.length}+</div>
            <div className="stat-label">Sân có sẵn</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{services.length}+</div>
            <div className="stat-label">Dịch vụ</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">1000+</div>
            <div className="stat-label">Khách hàng hài lòng</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Hỗ trợ trực tuyến</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src={appleImg} alt="Apple" className="logo-icon" />
              <span className="logo-text">Pickleball Bồ Đề</span>
            </div>
            <div className="footer-info">
              <p>Hệ thống sân pickleball hiện đại và chuyên nghiệp</p>
              <p>
                📍 Địa chỉ: 237 đường Phú Viên, phố Bồ Đề, quận Long Biên, TP.Hà
                Nội
              </p>
              <p>📞 Hotline: 0900 123 456</p>
              <p>✉️ Email: contact@pickleballbode.com</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Pickleball Bồ Đề. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
