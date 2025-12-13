import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';
import './BookingPage.scss';

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [availability, setAvailability] = useState([]);
  const [searchParams, setSearchParams] = useState(
    location.state?.searchParams || {
      date: '',
      startTime: '',
      endTime: '',
    }
  );

  const [services, setServices] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const { user, isAuthenticated } = useAuth();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(
    location.state?.selectedContact || null
  );
  const [paymentMethod, setPaymentMethod] = useState('cash'); // Default to cash
  const [timeOptions, setTimeOptions] = useState([]);

  useEffect(() => {
    // Update selectedContact if coming from Contacts page
    if (location.state?.selectedContact) {
      setSelectedContact(location.state.selectedContact);
    }
    // restore selected slots/services/paymentMethod when navigating back from payment
    if (location.state?.selectedSlots) {
      setSelectedSlots(location.state.selectedSlots);
    }
    if (location.state?.selectedServices) {
      setSelectedServices(location.state.selectedServices);
    }
    if (location.state?.paymentMethod) {
      setPaymentMethod(location.state.paymentMethod);
    }
    // Load from localStorage if not coming from navigation and user is available
    else if (user?.id && !selectedContact) {
      try {
        const storageKey = `selectedContact_${user.id}`;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          setSelectedContact(JSON.parse(raw));
        }
      } catch {
        // ignore localStorage errors
      }
    }

    fetchServices();

    // If navigated from Homepage with availability/searchParams prefilled, use them.
    if (location.state?.availability && location.state?.searchParams) {
      setAvailability(location.state.availability || []);
      setSearchParams(location.state.searchParams);
    }
    // Otherwise, do not auto-fetch. User must explicitly search to load availability.
  }, [location.state, user?.id, selectedContact]);

  // Fetch available time options from API based on selected date
  useEffect(() => {
    const fetchTimeOptions = async () => {
      if (!searchParams.date) {
        setTimeOptions([]);
        return;
      }

      try {
        // Fetch slots for the first court to get available time range
        const courtsResponse = await publicApi.get('/public/courts');
        const courts = courtsResponse.data?.data || [];
        if (courts.length === 0) return;

        const firstCourtId = courts[0].id;
        const slotsResponse = await publicApi.get(
          `/public/availability/courts/${firstCourtId}`,
          { params: { date: searchParams.date } }
        );
        
        const slots = slotsResponse.data?.data?.slots || [];
        if (slots.length === 0) return;

        const now = new Date();
        const selectedDate = new Date(searchParams.date);
        const isToday = selectedDate.toDateString() === now.toDateString();
        const currentHour = isToday ? now.getHours() : -1;

        // Extract unique time options from slots and filter out past hours for today
        const timeSet = new Set();
        slots.forEach((slot) => {
          const hour = parseInt(slot.start_time.split(':')[0], 10);
          if (!isToday || hour > currentHour) {
            timeSet.add(slot.start_time.slice(0, 5));
          }
        });

        // Add end time of last slot as well
        if (slots.length > 0) {
          const lastSlot = slots[slots.length - 1];
          const endHour = parseInt(lastSlot.end_time.split(':')[0], 10);
          if (!isToday || endHour > currentHour) {
            timeSet.add(lastSlot.end_time.slice(0, 5));
          }
        }

        const sortedTimes = Array.from(timeSet).sort();
        setTimeOptions(sortedTimes);
      } catch (error) {
        console.error('Error fetching time options:', error);
        // Fallback to default range if API fails
        const defaultOptions = [];
        for (let hour = 6; hour <= 22; hour++) {
          defaultOptions.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        setTimeOptions(defaultOptions);
      }
    };

    fetchTimeOptions();
  }, [searchParams.date]);

  // Helper to parse hour number from a time string like '09:00'
  const parseHour = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    return Number.isFinite(parts[0]) ? parts[0] : null;
  };

  // Reset time selections when date changes and selected times are no longer valid
  useEffect(() => {
    if (searchParams.date && timeOptions.length > 0) {
      // Reset start time if it's no longer available
      if (
        searchParams.startTime &&
        !timeOptions.includes(searchParams.startTime)
      ) {
        setSearchParams((prev) => ({ ...prev, startTime: '', endTime: '' }));
      }
      // Reset end time if start time was reset or end time is no longer available
      else if (
        searchParams.endTime &&
        !timeOptions.includes(searchParams.endTime)
      ) {
        setSearchParams((prev) => ({ ...prev, endTime: '' }));
      }
    }
  }, [searchParams.date, searchParams.startTime, searchParams.endTime, timeOptions]);

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
    // Validate start/end times
    if (!searchParams.startTime || !searchParams.endTime) {
      toast.error('Vui lòng chọn giờ bắt đầu và giờ kết thúc');
      return;
    }

    const startHour = parseHour(searchParams.startTime);
    const endHour = parseHour(searchParams.endTime);
    if (startHour === null || endHour === null || endHour <= startHour) {
      toast.error('Giờ kết thúc phải lớn hơn giờ bắt đầu');
      return;
    }

    setLoading(true);
    // Clear previous selections/pricing when running a fresh availability check
    setSelectedSlots([]);
    setSelectedServices([]);
    setPricing(null);
    try {
      const response = await publicApi.get('/public/availability', {
        params: {
          date: searchParams.date,
          start_time: searchParams.startTime,
          end_time: searchParams.endTime,
        },
      });
      const availabilityData = response.data.data || [];
      setAvailability(availabilityData);

      // Check if any courts are available
      const availableCourts = availabilityData.filter(
        (court) => court.is_available
      );
      if (availabilityData.length > 0 && availableCourts.length === 0) {
        // Courts exist but none are available
        const hasShiftIssues = availabilityData.some(
          (court) =>
            court.bookings &&
            court.bookings.some(
              (booking) =>
                booking.reason &&
                (booking.reason.includes('ca làm việc') ||
                  booking.reason.includes('giờ hoạt động'))
            )
        );

        if (hasShiftIssues) {
          toast.error(
            'Không có sân trống vào khung giờ này. Vui lòng chọn khung giờ khác.'
          );
        } else {
          toast.error(
            'Tất cả sân đã được đặt trong khung giờ này. Vui lòng chọn khung giờ khác.'
          );
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Lỗi khi kiểm tra tình trạng sân');
    } finally {
      setLoading(false);
    }
  };

  // compute end time options so user can't pick an end <= start
  const endTimeOptions = timeOptions.filter((t) => {
    if (!searchParams.startTime) return true;
    const startH = parseHour(searchParams.startTime);
    const h = parseHour(t);
    return h > startH;
  });

  const calculatePrice = useCallback(async () => {
    if (selectedSlots.length === 0) {
      setPricing(null);
      return;
    }

    try {
      const response = await publicApi.post(
        '/public/availability/calculate-price',
        {
          ngay_su_dung: searchParams.date,
          slots: selectedSlots,
          services: selectedServices,
        }
      );
      setPricing(response.data.data);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  }, [selectedSlots, selectedServices, searchParams.date]);

  useEffect(() => {
    if (selectedSlots.length > 0) {
      calculatePrice();
    } else {
      // clear pricing when no slots selected
      setPricing(null);
    }
  }, [calculatePrice, selectedSlots.length]);

  const handleSlotToggle = (courtId, startTime, endTime) => {
    // Toggle exact match; otherwise add new slot but replace any overlapping slots for same court
    const existingExactIndex = selectedSlots.findIndex(
      (slot) =>
        slot.san_id === courtId &&
        slot.start_time === startTime &&
        slot.end_time === endTime
    );

    if (existingExactIndex >= 0) {
      // exact match found -> toggle off
      setSelectedSlots((prev) =>
        prev.filter((_, index) => index !== existingExactIndex)
      );
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
    const filtered = selectedSlots.filter((s) => {
      if (s.san_id !== courtId) return true; // keep slots for other courts
      const sStart = parseToMinutes(s.start_time);
      const sEnd = parseToMinutes(s.end_time);
      // no overlap if newEnd <= sStart OR newStart >= sEnd
      const noOverlap = newEnd <= sStart || newStart >= sEnd;
      return noOverlap; // keep only non-overlapping
    });

    // Add the new slot (replace overlapping ones)
    setSelectedSlots([
      ...filtered,
      { san_id: courtId, start_time: startTime, end_time: endTime },
    ]);
  };

  const handleServiceToggle = (serviceId, quantity = 1) => {
    const existingServiceIndex = selectedServices.findIndex(
      (s) => s.dich_vu_id === serviceId
    );

    if (existingServiceIndex >= 0) {
      if (quantity === 0) {
        setSelectedServices((prev) =>
          prev.filter((_, index) => index !== existingServiceIndex)
        );
      } else {
        setSelectedServices((prev) =>
          prev.map((service, index) =>
            index === existingServiceIndex
              ? { ...service, so_luong: quantity }
              : service
          )
        );
      }
    } else if (quantity > 0) {
      setSelectedServices((prev) => [
        ...prev,
        { dich_vu_id: serviceId, so_luong: quantity },
      ]);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated()) {
      alert('Vui lòng đăng nhập để đặt sân');
      navigate('/login');
      return;
    }

    if (selectedSlots.length === 0) {
      alert('Vui lòng chọn ít nhất một khung giờ');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        user_id: user?.id,
        ngay_su_dung: searchParams.date,
        slots: selectedSlots.map((slot) => ({
          ...slot,
          ghi_chu: `Đặt sân ${slot.san_id}`,
        })),
        services: selectedServices,
        payment_method: paymentMethod,
        note: 'Đặt sân từ website',
      };

      // Use selectedContact info if available, otherwise use user info
      if (selectedContact) {
        bookingData.contact_snapshot = {
          contact_name: selectedContact.full_name,
          contact_phone: selectedContact.phone,
          contact_email: selectedContact.email || null,
        };
      }

      console.debug('Booking payload:', bookingData);

      // If user chose online payment, defer actual booking creation until
      // they confirm payment on the /payment page. Pass the booking payload
      // and useful UI state so Payment can post it later or user can go back.
      if (paymentMethod === 'bank_transfer') {
        // stop loading before navigating
        setLoading(false);
        navigate('/payment', {
          state: {
            bookingData,
            pricing,
            searchParams,
            selectedContact,
            selectedSlots,
            selectedServices,
            paymentMethod,
          },
        });
        return;
      }

      // For cash payment, create booking immediately as before
      const response = await publicApi.post('/public/bookings', bookingData);

      if (response.data && response.data.success) {
        const bookingToken = response.data.data.booking.ma_pd;

        // Navigate directly to confirmation for cash payment
        navigate('/booking-confirmation', {
          state: {
            booking: response.data.data,
            token: bookingToken,
          },
        });
        return;
      }
      // If response indicates failure, show message
      if (response.data && !response.data.success) {
        alert(response.data.message || 'Không thể đặt sân');
      }
    } catch (error) {
      console.error('Error creating booking:', error, error?.response?.data);
      const serverMsg = error?.response?.data?.message;
      const serverDetails = error?.response?.data?.details;
      if (serverMsg || serverDetails) {
        const detailText = serverDetails ? '\n' + serverDetails.join('\n') : '';
        alert(
          `Lỗi khi đặt sân: ${serverMsg || 'Validation error'}${detailText}`
        );
      } else {
        alert('Có lỗi xảy ra khi đặt sân. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

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
                onChange={(e) =>
                  setSearchParams((prev) => ({ ...prev, date: e.target.value }))
                }
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label>Giờ bắt đầu</label>
              <select
                value={searchParams.startTime}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
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
                value={searchParams.endTime}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
              >
                <option value="">Chọn giờ</option>
                {endTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="search-btn"
              onClick={checkAvailability}
              disabled={loading}
            >
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
        </div>

        {/* Court Availability */}
        {availability.length > 0 && (
          <div className="availability-section">
            <h2>Chọn sân và giờ</h2>
            <div className="courts-grid">
              {availability.map((court) => (
                <div key={court.san_id} className="court-card">
                  <h3>
                    {court.ten_san} ({court.ma_san})
                  </h3>
                  <p>Sức chứa: {court.suc_chua} người</p>

                  {court.is_available ? (
                    <div className="time-slots">
                      <div
                        className={`time-slot available ${
                          selectedSlots.some(
                            (s) =>
                              s.san_id === court.san_id &&
                              s.start_time === searchParams.startTime &&
                              s.end_time === searchParams.endTime
                          )
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          handleSlotToggle(
                            court.san_id,
                            searchParams.startTime,
                            searchParams.endTime
                          )
                        }
                      >
                        {searchParams.startTime} - {searchParams.endTime}
                      </div>
                    </div>
                  ) : (
                    <div className="unavailable">
                      {(() => {
                        const hasShiftIssue =
                          court.bookings &&
                          court.bookings.some(
                            (booking) =>
                              booking.reason &&
                              (booking.reason.includes('ca làm việc') ||
                                booking.reason.includes('giờ hoạt động'))
                          );

                        if (hasShiftIssue) {
                          return (
                            <p>Không có ca làm việc trong khung giờ này</p>
                          );
                        } else {
                          return (
                            <>
                              <p>Không có sẵn trong khung giờ này</p>
                              {court.bookings?.map((booking, index) => (
                                <div key={index} className="existing-booking">
                                  {booking.start_time} - {booking.end_time} (Đã
                                  đặt)
                                </div>
                              ))}
                            </>
                          );
                        }
                      })()}
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
              {services.map((service) => (
                <div key={service.id} className="service-card">
                  <h4>{service.ten_dv}</h4>
                  <p>
                    Giá: {service.don_gia.toLocaleString()}đ{' '}
                    {service.loai === 'rent' ? '/giờ' : ''}
                  </p>
                  <p>{service.ghi_chu}</p>
                  <div className="quantity-control">
                    <label>Số lượng:</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      defaultValue="0"
                      onChange={(e) =>
                        handleServiceToggle(
                          service.id,
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Information (from logged-in user or selected contact) */}
        <div className="customer-section">
          <h2>Thông tin khách hàng</h2>
          <div className="customer-form">
            <div className="form-group">
              <label>Họ tên</label>
              <input
                type="text"
                value={
                  selectedContact?.full_name ||
                  user?.full_name ||
                  user?.username ||
                  ''
                }
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="tel"
                value={selectedContact?.phone || user?.phone || ''}
                readOnly
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={selectedContact?.email || user?.email || ''}
                readOnly
              />
            </div>
            {/* <div className="form-group">
              <button className="btn" onClick={() => navigate('/contacts')}>
                Thay đổi thông tin liên hệ
              </button>
            </div> */}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="payment-method-section">
          <h2>Phương thức thanh toán</h2>
          <div className="payment-options">
            <label className="payment-option">
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div className="payment-option-content">
                <span className="payment-icon">💵</span>
                <div className="payment-details">
                  <strong>Trả tiền mặt</strong>
                  <p>Thanh toán trực tiếp tại quầy</p>
                </div>
              </div>
            </label>

            <label className="payment-option">
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div className="payment-option-content">
                <span className="payment-icon">🏦</span>
                <div className="payment-details">
                  <strong>Thanh toán online</strong>
                  <p>Chuyển khoản qua ngân hàng</p>
                </div>
              </div>
            </label>
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
            {loading
              ? 'Đang đặt sân...'
              : paymentMethod === 'bank_transfer'
              ? 'Đặt sân & Thanh toán Online'
              : 'Đặt sân (Trả tiền mặt)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
