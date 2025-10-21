import React, { useEffect, useState, useCallback } from 'react';
import api, { publicApi } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import toast from '../../utils/toast';
import './Admin.scss';
import './Bookings.scss';

const Bookings = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Booking flow states - similar to customer booking
  const [searchParams, setSearchParams] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [availability, setAvailability] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  // Services and pricing
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [bookingNote, setBookingNote] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings');
      setBookings(res.data.data || []);
    } catch (err) {
      console.error('Fetch bookings error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await publicApi.get('/public/services');
      setServices(res.data.data || []);
    } catch (err) {
      console.error('Fetch services error', err);
    }
  };

  const checkAvailability = async () => {
    if (!searchParams.date) return;

    setLoading(true);
    // Clear previous selections when checking new availability
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
      setAvailability(response.data.data || []);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Lỗi khi kiểm tra tình trạng sân');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewCustomer = async () => {
    const { full_name, phone, email } = newCustomerForm;
    if (!full_name || !phone) {
      toast.error('Vui lòng nhập tên và số điện thoại');
      return;
    }

    try {
      const res = await api.post('/customers', newCustomerForm);
      if (res.data && res.data.success) {
        setSelectedCustomer(res.data.data);
        setShowCustomerModal(false);
        setNewCustomerForm({ full_name: '', phone: '', email: '' });
        toast.success('Tạo khách hàng thành công');
      } else {
        toast.error(res.data?.message || 'Không thể tạo khách hàng');
      }
    } catch (err) {
      console.error('Create customer error', err);
      toast.error('Lỗi khi tạo khách hàng');
    }
  };

  const searchCustomers = async (query) => {
    if (!query) {
      setCustomers([]);
      return;
    }
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(query)}`);
      if (res.data && res.data.success) {
        setCustomers(res.data.data || []);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error('Search customers error', err);
      setCustomers([]);
      // do not spam toast on each keystroke
    }
  };

  const calculatePrice = useCallback(async () => {
    if (!searchParams.date || selectedSlots.length === 0) {
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
      if (error?.response) {
        const details = error.response.data?.details;
        if (Array.isArray(details) && details.length > 0) {
          toast.error(details.join('; '));
        } else if (error.response.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('Lỗi khi tính giá (server)');
        }
      } else {
        console.error('Error calculating price:', error);
        toast.error('Lỗi khi tính giá');
      }
    }
  }, [searchParams.date, selectedSlots, selectedServices]);

  const handleCreateBooking = async () => {
    if (!selectedCustomer) {
      toast.error('Vui lòng chọn khách hàng');
      return;
    }

    if (!searchParams.date || selectedSlots.length === 0) {
      toast.error('Vui lòng chọn ngày và sân');
      return;
    }

    try {
      const payload = {
        user_id: selectedCustomer.id,
        ngay_su_dung: searchParams.date,
        slots: selectedSlots,
        services: selectedServices,
        payment_method: 'cash',
        note: bookingNote,
        contact_snapshot: {
          contact_name: selectedCustomer.ho_ten || selectedCustomer.full_name,
          contact_phone: selectedCustomer.sdt || selectedCustomer.phone,
          contact_email: selectedCustomer.email,
        },
      };

      const res = await api.post('/bookings', payload);

      toast.success('Tạo đơn đặt thành công');
      setShowBookingModal(false);
      resetBookingForm();
      fetchBookings();
    } catch (err) {
      console.error('Create booking error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi tạo đơn đặt');
    }
  };

  const resetBookingForm = () => {
    setSearchParams({
      date: '',
      startTime: '',
      endTime: '',
    });
    setAvailability([]);
    setSelectedSlots([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomers([]);
    setSelectedServices([]);
    setPricing(null);
    setBookingNote('');
  };

  const handleServiceToggle = (serviceId, quantity = 1) => {
    const existingIndex = selectedServices.findIndex(
      (s) => s.dich_vu_id === serviceId
    );
    if (existingIndex >= 0) {
      if (quantity === 0) {
        setSelectedServices((prev) =>
          prev.filter((_, i) => i !== existingIndex)
        );
      } else {
        setSelectedServices((prev) =>
          prev.map((s, i) =>
            i === existingIndex ? { ...s, so_luong: quantity } : s
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

  useEffect(() => {
    fetchBookings();
    fetchServices();
  }, []);

  // Calculate price when selections change
  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Quản lý đơn đặt</h1>
        <p className="page-subtitle">Theo dõi và quản lý tất cả đơn đặt sân</p>
      </div>

      <div className="page-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowBookingModal(true)}
        >
          ➕ Tạo đơn đặt
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>MaPD</th>
              <th>Ngày</th>
              <th>Người đặt</th>
              <th>Trạng thái</th>
              <th>Tổng tiền</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.ma_pd}</td>
                <td>{b.ngay_su_dung}</td>
                <td>{b.contact_name || b.user_id}</td>
                <td>
                  <span className={`booking-status ${b.trang_thai}`}>
                    {b.trang_thai}
                  </span>
                </td>
                <td>{Number(b.tong_tien || 0).toLocaleString('vi-VN')}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal tạo đơn đặt */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          resetBookingForm();
        }}
        title="Tạo đơn đặt sân"
        size="large"
      >
        <div className="booking-form">
          {/* Chọn khách hàng */}
          <div className="form-group">
            <label>Khách hàng:</label>
            {selectedCustomer ? (
              <div className="selected-customer">
                <span>
                  {selectedCustomer.full_name} - {selectedCustomer.phone}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Đổi khách hàng
                </button>
              </div>
            ) : (
              <div className="customer-selection">
                <input
                  type="text"
                  placeholder="Tìm khách hàng theo tên..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCustomerModal(true)}
                >
                  Tạo khách hàng mới
                </button>

                {customers.length > 0 && (
                  <div className="customer-list">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className="customer-item"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch('');
                          setCustomers([]);
                        }}
                      >
                        <span>{customer.full_name}</span>
                        <span className="muted">
                          {customer.phone} - {customer.email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Form */}
          <div className="booking-search">
            <h4>1. Chọn ngày và khung giờ</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Ngày sử dụng:</label>
                <input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      date: e.target.value,
                    })
                  }
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label>Giờ bắt đầu:</label>
                <select
                  value={searchParams.startTime}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      startTime: e.target.value,
                    })
                  }
                >
                  <option value="">Chọn giờ</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option
                      key={i}
                      value={`${i.toString().padStart(2, '0')}:00`}
                    >
                      {`${i.toString().padStart(2, '0')}:00`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Giờ kết thúc:</label>
                <select
                  value={searchParams.endTime}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      endTime: e.target.value,
                    })
                  }
                >
                  <option value="">Chọn giờ</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option
                      key={i}
                      value={`${i.toString().padStart(2, '0')}:00`}
                    >
                      {`${i.toString().padStart(2, '0')}:00`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={checkAvailability}
                  disabled={!searchParams.date}
                >
                  Tìm sân trống
                </button>
              </div>
            </div>
          </div>

          {/* Available Courts */}
          {availability.length > 0 && (
            <div className="available-courts">
              <h4>2. Chọn sân</h4>
              <div className="courts-grid">
                {availability.map((court) => {
                  const slotStart = court.start_time || searchParams.startTime;
                  const slotEnd = court.end_time || searchParams.endTime;
                  const available = court.is_available !== false; // undefined or true => available
                  const isSelected = selectedSlots.some(
                    (slot) => slot.san_id === court.san_id && slot.start_time === slotStart
                  );

                  return (
                    <div
                      key={`${court.san_id}-${slotStart}`}
                      className={`court-card ${isSelected ? 'selected' : ''} ${available ? '' : 'disabled'}`}
                      onClick={() => {
                        // require a selected start/end time (from the search form) or availability item
                        if (!slotStart || !slotEnd) {
                          toast.error('Vui lòng chọn giờ bắt đầu và giờ kết thúc trước khi chọn sân');
                          return;
                        }

                        if (!available) {
                          // match customer behaviour: cannot select unavailable courts
                          toast.error('Sân đã được đặt trong khung giờ này');
                          return;
                        }

                        if (isSelected) {
                          setSelectedSlots(
                            selectedSlots.filter(
                              (slot) => !(slot.san_id === court.san_id && slot.start_time === slotStart)
                            )
                          );
                        } else {
                          setSelectedSlots([
                            ...selectedSlots,
                            {
                              san_id: court.san_id,
                              start_time: slotStart,
                              end_time: slotEnd,
                            },
                          ]);
                        }
                      }}
                    >
                      <div className="court-name">{court.ten_san}</div>
                      <div className="court-time">
                        {slotStart || '-'} - {slotEnd || '-'}
                      </div>
                      {!available && (
                        <div className="court-unavailable">
                          <span>Đã đặt</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Services */}
          {selectedSlots.length > 0 && (
            <div className="services-section">
              <h4>3. Chọn dịch vụ (tùy chọn)</h4>
              <div className="services-list">
                {services.map((service) => {
                  const selected = selectedServices.find(
                    (s) => s.dich_vu_id === service.id
                  );
                  return (
                    <div key={service.id} className="service-item">
                      <span>
                        {service.ten_dich_vu} -{' '}
                        {Number(service.don_gia).toLocaleString('vi-VN')}đ
                      </span>
                      <div className="service-controls">
                        <button
                          type="button"
                          onClick={() =>
                            handleServiceToggle(
                              service.id,
                              Math.max(0, (selected?.so_luong || 0) - 1)
                            )
                          }
                        >
                          -
                        </button>
                        <span>{selected?.so_luong || 0}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleServiceToggle(
                              service.id,
                              (selected?.so_luong || 0) + 1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          {pricing && (
            <div className="pricing-summary">
              <h4>Tổng cộng</h4>
              <div className="pricing-details">
                {(() => {
                  // support both new controller shape and legacy keys
                  const slotsTotal =
                    pricing?.summary?.slots_total ?? pricing?.slots_total ?? pricing?.subtotal ?? 0;
                  const servicesTotal =
                    pricing?.summary?.services_total ?? pricing?.services_total ?? pricing?.services_total ?? 0;
                  const grandTotal =
                    pricing?.summary?.grand_total ?? pricing?.total ?? pricing?.grand_total ?? 0;

                  return (
                    <>
                      <div className="price-row">
                        <span>Tiền sân:</span>
                        <span>{Number(slotsTotal).toLocaleString('vi-VN')}đ</span>
                      </div>
                      {Number(servicesTotal) > 0 && (
                        <div className="price-row">
                          <span>Dịch vụ:</span>
                          <span>{Number(servicesTotal).toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                      <div className="price-row total">
                        <span>Tổng cộng:</span>
                        <span>{Number(grandTotal).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Ghi chú:</label>
            <textarea
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              placeholder="Ghi chú thêm..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowBookingModal(false);
                resetBookingForm();
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateBooking}
              disabled={!selectedCustomer || selectedSlots.length === 0}
            >
              Tạo đơn đặt
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal tạo khách hàng mới */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Tạo khách hàng mới"
      >
        <div className="customer-form">
          <div className="form-group">
            <label>Họ tên:</label>
            <input
              type="text"
              value={newCustomerForm.full_name}
              onChange={(e) =>
                setNewCustomerForm({
                  ...newCustomerForm,
                  full_name: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Số điện thoại:</label>
            <input
              type="tel"
              value={newCustomerForm.phone}
              onChange={(e) =>
                setNewCustomerForm({
                  ...newCustomerForm,
                  phone: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={newCustomerForm.email}
              onChange={(e) =>
                setNewCustomerForm({
                  ...newCustomerForm,
                  email: e.target.value,
                })
              }
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCustomerModal(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateNewCustomer}
            >
              Tạo khách hàng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Bookings;
