import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/api';
import './BookingPage.scss';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [availability, setAvailability] = useState(location.state?.availability || []);
  const [searchParams, setSearchParams] = useState(location.state?.searchParams || {
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: ''
  });
  
  const [services, setServices] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    full_name: '',
    phone: '',
    email: ''
  });
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchServices();
    if (!availability.length && searchParams.date) {
      checkAvailability();
    }
  }, []);
  
  useEffect(() => {
    if (selectedSlots.length > 0) {
      calculatePrice();
    }
  }, [selectedSlots, selectedServices]);
  
  const fetchServices = async () => {
    try {
      const response = await publicApi.get('/public/services');
      setServices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };
  
  const checkAvailability = async () => {
    if (!searchParams.date) return;
    
    setLoading(true);
    // Clear previous selections/pricing when running a fresh availability check
    setSelectedSlots([]);
    setSelectedServices([]);
    setPricing(null);
    try {
      const response = await publicApi.get('/public/availability', {
        params: searchParams
      });
      setAvailability(response.data.data || []);
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculatePrice = async () => {
    if (selectedSlots.length === 0) {
      setPricing(null);
      return;
    }
    
    try {
      const response = await publicApi.post('/public/availability/calculate-price', {
        ngay_su_dung: searchParams.date,
        slots: selectedSlots,
        services: selectedServices
      });
      setPricing(response.data.data);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };
  
  const handleSlotToggle = (courtId, startTime, endTime) => {
    // Toggle exact match; otherwise add new slot but replace any overlapping slots for same court
    const existingExactIndex = selectedSlots.findIndex(
      slot => slot.san_id === courtId && slot.start_time === startTime && slot.end_time === endTime
    );

    if (existingExactIndex >= 0) {
      // exact match found -> toggle off
      setSelectedSlots(prev => prev.filter((_, index) => index !== existingExactIndex));
      return;
    }

    // parse times to minutes for overlap checks
    const parseToMinutes = (t) => {
      const [hh, mm] = t.split(':').map(Number);
      return hh * 60 + mm;
    };
    const newStart = parseToMinutes(startTime);
    const newEnd = parseToMinutes(endTime);

    // filter out overlapping slots for same court
    const filtered = selectedSlots.filter(s => {
      if (s.san_id !== courtId) return true; // keep slots for other courts
      const sStart = parseToMinutes(s.start_time);
      const sEnd = parseToMinutes(s.end_time);
      // no overlap if newEnd <= sStart OR newStart >= sEnd
      const noOverlap = newEnd <= sStart || newStart >= sEnd;
      return noOverlap; // keep only non-overlapping
    });

    // Add the new slot (replace overlapping ones)
    setSelectedSlots([...filtered, { san_id: courtId, start_time: startTime, end_time: endTime }]);
  };
  
  const handleServiceToggle = (serviceId, quantity = 1) => {
    const existingServiceIndex = selectedServices.findIndex(s => s.dich_vu_id === serviceId);
    
    if (existingServiceIndex >= 0) {
      if (quantity === 0) {
        setSelectedServices(prev => prev.filter((_, index) => index !== existingServiceIndex));
      } else {
        setSelectedServices(prev => prev.map((service, index) => 
          index === existingServiceIndex ? { ...service, so_luong: quantity } : service
        ));
      }
    } else if (quantity > 0) {
      setSelectedServices(prev => [...prev, { dich_vu_id: serviceId, so_luong: quantity }]);
    }
  };
  
  const handleBooking = async () => {
    if (!customerInfo.full_name || !customerInfo.phone) {
      alert('Vui lòng điền đầy đủ thông tin khách hàng');
      return;
    }
    
    if (selectedSlots.length === 0) {
      alert('Vui lòng chọn ít nhất một khung giờ');
      return;
    }
    
    setLoading(true);
    try {
      const bookingData = {
        user_id: null,
        customer: customerInfo,
        ngay_su_dung: searchParams.date,
        slots: selectedSlots.map(slot => ({
          ...slot,
          ghi_chu: `Đặt sân ${slot.san_id}`
        })),
        services: selectedServices,
        payment_method: 'cash',
        note: 'Đặt sân từ website'
      };
      
      const response = await publicApi.post('/public/bookings', bookingData);
      
      if (response.data.success) {
        const bookingToken = response.data.data.booking.ma_pd;
        alert(`Đặt sân thành công! Mã đặt sân: ${bookingToken}`);
        navigate('/booking-confirmation', { 
          state: { 
            booking: response.data.data,
            token: bookingToken
          }
        });
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Có lỗi xảy ra khi đặt sân. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };
  
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    timeOptions.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  
  return (
    <div className="booking-page">
      <div className="booking-container">
        <h1 className="page-title">Đặt sân Pickleball</h1>
        
        {/* Search Form */}
        <div className="search-section">
          <h2>Tìm kiếm sân trống</h2>
          <div className="search-form">
            <div className="form-group">
              <label>Ngày</label>
              <input
                type="date"
                value={searchParams.date}
                onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Giờ bắt đầu</label>
              <select
                value={searchParams.startTime}
                onChange={(e) => setSearchParams(prev => ({ ...prev, startTime: e.target.value }))}
              >
                <option value="">Chọn giờ</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Giờ kết thúc</label>
              <select
                value={searchParams.endTime}
                onChange={(e) => setSearchParams(prev => ({ ...prev, endTime: e.target.value }))}
              >
                <option value="">Chọn giờ</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <button className="search-btn" onClick={checkAvailability} disabled={loading}>
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
        </div>
        
        {/* Court Availability */}
        {availability.length > 0 && (
          <div className="availability-section">
            <h2>Chọn sân và giờ</h2>
            <div className="courts-grid">
              {availability.map(court => (
                <div key={court.san_id} className="court-card">
                  <h3>{court.ten_san} ({court.ma_san})</h3>
                  <p>Sức chứa: {court.suc_chua} người</p>
                  
                  {court.is_available ? (
                    <div className="time-slots">
                      <div 
                        className={`time-slot available ${
                          selectedSlots.some(s => 
                            s.san_id === court.san_id && 
                            s.start_time === searchParams.startTime && 
                            s.end_time === searchParams.endTime
                          ) ? 'selected' : ''
                        }`}
                        onClick={() => handleSlotToggle(
                          court.san_id, 
                          searchParams.startTime, 
                          searchParams.endTime
                        )}
                      >
                        {searchParams.startTime} - {searchParams.endTime}
                      </div>
                    </div>
                  ) : (
                    <div className="unavailable">
                      <p>Không có sẵn trong khung giờ này</p>
                      {court.bookings?.map((booking, index) => (
                        <div key={index} className="existing-booking">
                          {booking.start_time} - {booking.end_time} (Đã đặt)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Services */}
        {services.length > 0 && (
          <div className="services-section">
            <h2>Dịch vụ thêm</h2>
            <div className="services-grid">
              {services.map(service => (
                <div key={service.id} className="service-card">
                  <h4>{service.ten_dv}</h4>
                  <p>Giá: {service.don_gia.toLocaleString()}đ {service.loai === 'rent' ? '/giờ' : ''}</p>
                  <p>{service.ghi_chu}</p>
                  <div className="quantity-control">
                    <label>Số lượng:</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      defaultValue="0"
                      onChange={(e) => handleServiceToggle(service.id, parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Customer Information */}
        <div className="customer-section">
          <h2>Thông tin khách hàng</h2>
          <div className="customer-form">
            <div className="form-group">
              <label>Họ tên *</label>
              <input
                type="text"
                value={customerInfo.full_name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nhập họ và tên"
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại *</label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Nhập email (tùy chọn)"
              />
            </div>
          </div>
        </div>
        
        {/* Pricing Summary */}
        {pricing && (
          <div className="pricing-section">
            <h2>Tổng thanh toán</h2>
            <div className="pricing-details">
              <div className="price-row">
                <span>Tiền sân:</span>
                <span>{pricing.summary.slots_total.toLocaleString()}đ</span>
              </div>
              <div className="price-row">
                <span>Dịch vụ:</span>
                <span>{pricing.summary.services_total.toLocaleString()}đ</span>
              </div>
              <div className="price-row total">
                <span>Tổng cộng:</span>
                <span>{pricing.summary.grand_total.toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Booking Button */}
        <div className="booking-actions">
          <button 
            className="book-btn"
            onClick={handleBooking}
            disabled={loading || selectedSlots.length === 0}
          >
            {loading ? 'Đang đặt sân...' : 'Đặt sân ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;