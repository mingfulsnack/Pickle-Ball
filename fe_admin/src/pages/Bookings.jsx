import { useEffect, useState, useCallback } from 'react';
import api, { publicApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import toast from '../utils/toast';
import './Admin.scss';
import './Bookings.scss';

const Bookings = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Search states
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

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
  // Status modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const fetchBookings = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
      };

      if (searchName.trim()) {
        params.search_name = searchName.trim();
      }

      if (searchPhone.trim()) {
        params.search_phone = searchPhone.trim();
      }

      const res = await api.get('/bookings', { params });
      const responseData = res.data.data;

      if (responseData.bookings) {
        // New paginated response format
        setBookings(responseData.bookings || []);
        setPagination(responseData.pagination || {});
      } else {
        // Legacy format fallback
        setBookings(responseData || []);
      }
    } catch (err) {
      console.error('Fetch bookings error', err);
      toast.error('Lỗi khi tải danh sách đơn đặt');
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

  const handleCreateNewCustomer = async () => {
    const { full_name, phone } = newCustomerForm;
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
      // use params object (consistent with Customers page) and normalize returned fields
      const res = await api.get('/customers', { params: { search: query } });
      if (res.data && res.data.success) {
        const raw = res.data.data || [];
        const mapped = raw.map((c) => ({
          id: c.id,
          full_name: c.full_name || c.ho_ten || c.fullName || c.name || '',
          phone: c.phone || c.sdt || c.mobile || '',
          email: c.email || '',
          created_at: c.created_at,
        }));
        setCustomers(mapped);
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

      await api.post('/bookings', payload);

      toast.success('Tạo đơn đặt thành công');
      setShowBookingModal(false);
      resetBookingForm();
      fetchBookings(pagination.currentPage);
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

  const handleSaveStatus = async (updated) => {
    if (!editingBooking) return;
    try {
      await api.put(`/bookings/${editingBooking.id}`, updated);
      toast.success('Cập nhật trạng thái thành công');
      setShowStatusModal(false);
      setEditingBooking(null);
      fetchBookings(pagination.currentPage);
    } catch (err) {
      console.error('Update booking status error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleExportInvoice = (booking) => {
    // Call protected endpoint to get PDF (arraybuffer) and trigger download
    return (async () => {
      try {
        const res = await api.get(`/invoices/create?bookingId=${booking.id}`, {
          responseType: 'arraybuffer',
        });

        // Check if response is actually a PDF
        const contentType =
          res.headers['content-type'] || res.headers['Content-Type'];
        if (!contentType || !contentType.includes('application/pdf')) {
          // Try to decode response as text to show error message
          const decoder = new TextDecoder();
          const text = decoder.decode(res.data);
          console.error('Server returned non-PDF response:', text);
          toast.error(
            'Server trả về lỗi: ' + (text.substring(0, 100) || 'Unknown error')
          );
          return;
        }

        // Validate that we have data
        if (!res.data || res.data.byteLength === 0) {
          toast.error('Received empty PDF file');
          return;
        }

        const blob = new Blob([res.data], { type: 'application/pdf' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const filename = `invoice_${booking.ma_pd || booking.id}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('Đã tạo hóa đơn, đang tải xuống...');
      } catch (err) {
        console.error('Export invoice error', err);
        if (err.response && err.response.status === 500) {
          toast.error('Lỗi server khi tạo PDF. Vui lòng thử lại.');
        } else {
          toast.error(err.response?.data?.message || 'Lỗi khi xuất hóa đơn');
        }
      }
    })();
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

  const handleSearch = () => {
    fetchBookings(1); // Reset to page 1 when searching
  };

  const handlePageChange = (newPage) => {
    fetchBookings(newPage);
  };

  // Live search: fetch when searchName or searchPhone changes with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchBookings(1); // Reset to page 1 when search terms change
    }, 300);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName, searchPhone]);

  useEffect(() => {
    fetchBookings();
    fetchServices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate price when selections change
  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // Function to get available time options based on selected date
  const getAvailableTimeOptions = useCallback(() => {
    const options = [];
    const now = new Date();
    const selectedDate = new Date(searchParams.date);
    const isToday = selectedDate.toDateString() === now.toDateString();

    for (let hour = 0; hour <= 23; hour++) {
      // If it's today, only show hours after current hour
      if (isToday) {
        const currentHour = now.getHours();
        if (hour <= currentHour) {
          continue; // Skip hours that have passed or current hour
        }
      }
      options.push({
        value: `${hour.toString().padStart(2, '0')}:00`,
        label: `${hour.toString().padStart(2, '0')}:00`,
      });
    }

    return options;
  }, [searchParams.date]);

  // Reset time selections when date changes and selected times are no longer valid
  useEffect(() => {
    if (searchParams.date) {
      const availableOptions = getAvailableTimeOptions();
      const availableTimeValues = availableOptions.map((opt) => opt.value);

      // Reset start time if it's no longer available
      if (
        searchParams.startTime &&
        !availableTimeValues.includes(searchParams.startTime)
      ) {
        setSearchParams((prev) => ({ ...prev, startTime: '', endTime: '' }));
      }
      // Reset end time if start time was reset or end time is no longer available
      else if (
        searchParams.endTime &&
        !availableTimeValues.includes(searchParams.endTime)
      ) {
        setSearchParams((prev) => ({ ...prev, endTime: '' }));
      }
    }
  }, [
    searchParams.date,
    searchParams.startTime,
    searchParams.endTime,
    getAvailableTimeOptions,
  ]);

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
          Tạo đơn đặt
        </button>

        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm theo tên khách hàng..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <input
            type="text"
            placeholder="Tìm theo số điện thoại..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-secondary" onClick={handleSearch}>
            🔍 Tìm kiếm
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã phiếu đặt</th>
              <th>Ngày đặt</th>
              <th>Tên khách hàng</th>
              <th>Điện thoại</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thanh toán</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.ma_pd || '-'}</td>
                <td>
                  {
                    // Format ngay_su_dung (ISO string) to dd/mm/yyyy
                    (() => {
                      const dateVal = b.ngay_su_dung;
                      if (!dateVal) return '-';
                      try {
                        const d = new Date(dateVal);
                        if (isNaN(d.getTime())) return dateVal;
                        return d.toLocaleDateString('vi-VN');
                      } catch (err) {
                        console.error('Date parse error', err);
                        return dateVal;
                      }
                    })()
                  }
                </td>
                <td>{b.contact_name || b.user_id}</td>
                <td>{b.contact_phone || b.sdt || b.phone || '-'}</td>
                <td>{Number(b.tong_tien || 0).toLocaleString('vi-VN')}</td>
                <td>
                  <span className={`booking-status ${b.trang_thai}`}>
                    {b.trang_thai}
                  </span>
                </td>
                <td>
                  {b.is_paid ? (
                    <span className="badge badge-success">Đã thanh toán</span>
                  ) : (
                    <span className="badge badge-warning">Chưa thanh toán</span>
                  )}
                </td>
                <td>
                  <div className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setEditingBooking(b);
                        setShowStatusModal(true);
                      }}
                    >
                      Sửa
                    </button>

                    {(b.trang_thai === 'confirmed' ||
                      b.trang_thai === 'received' ||
                      String(b.trang_thai).toLowerCase().includes('nhận')) &&
                      b.is_paid && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleExportInvoice(b)}
                        >
                          Xuất hóa đơn
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Hiển thị{' '}
            {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} -{' '}
            {Math.min(
              pagination.currentPage * pagination.itemsPerPage,
              pagination.totalItems
            )}{' '}
            của {pagination.totalItems} đơn đặt
          </div>
          <div className="pagination">
            <button
              className="btn btn-sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              ‹ Trước
            </button>

            {/* Page numbers */}
            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (
                  pagination.currentPage >=
                  pagination.totalPages - 2
                ) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${
                      pageNum === pagination.currentPage ? 'btn-primary' : ''
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}

            <button
              className="btn btn-sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              Sau ›
            </button>
          </div>
        </div>
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
                  {getAvailableTimeOptions().map((timeOption) => (
                    <option key={timeOption.value} value={timeOption.value}>
                      {timeOption.label}
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
                  {getAvailableTimeOptions().map((timeOption) => (
                    <option key={timeOption.value} value={timeOption.value}>
                      {timeOption.label}
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
                    (slot) =>
                      slot.san_id === court.san_id &&
                      slot.start_time === slotStart
                  );

                  return (
                    <div
                      key={`${court.san_id}-${slotStart}`}
                      className={`court-card ${isSelected ? 'selected' : ''} ${
                        available ? '' : 'disabled'
                      }`}
                      onClick={() => {
                        // require a selected start/end time (from the search form) or availability item
                        if (!slotStart || !slotEnd) {
                          toast.error(
                            'Vui lòng chọn giờ bắt đầu và giờ kết thúc trước khi chọn sân'
                          );
                          return;
                        }

                        if (!available) {
                          // Check if unavailable due to shift issues
                          const hasShiftIssue =
                            court.bookings &&
                            court.bookings.some(
                              (booking) =>
                                booking.reason &&
                                (booking.reason.includes('ca làm việc') ||
                                  booking.reason.includes('giờ hoạt động'))
                            );

                          if (hasShiftIssue) {
                            toast.error(
                              'Không có ca làm việc trong khung giờ này'
                            );
                          } else {
                            toast.error('Sân đã được đặt trong khung giờ này');
                          }
                          return;
                        }

                        if (isSelected) {
                          setSelectedSlots(
                            selectedSlots.filter(
                              (slot) =>
                                !(
                                  slot.san_id === court.san_id &&
                                  slot.start_time === slotStart
                                )
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
                          {(() => {
                            const hasShiftIssue =
                              court.bookings &&
                              court.bookings.some(
                                (booking) =>
                                  booking.reason &&
                                  (booking.reason.includes('ca làm việc') ||
                                    booking.reason.includes('giờ hoạt động'))
                              );
                            return (
                              <span>
                                {hasShiftIssue ? 'Không có ca' : 'Đã đặt'}
                              </span>
                            );
                          })()}
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
                    pricing?.summary?.slots_total ??
                    pricing?.slots_total ??
                    pricing?.subtotal ??
                    0;
                  const servicesTotal =
                    pricing?.summary?.services_total ??
                    pricing?.services_total ??
                    pricing?.services_total ??
                    0;
                  const grandTotal =
                    pricing?.summary?.grand_total ??
                    pricing?.total ??
                    pricing?.grand_total ??
                    0;

                  return (
                    <>
                      <div className="price-row">
                        <span>Tiền sân:</span>
                        <span>
                          {Number(slotsTotal).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      {Number(servicesTotal) > 0 && (
                        <div className="price-row">
                          <span>Dịch vụ:</span>
                          <span>
                            {Number(servicesTotal).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      )}
                      <div className="price-row total">
                        <span>Tổng cộng:</span>
                        <span>
                          {Number(grandTotal).toLocaleString('vi-VN')}đ
                        </span>
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

      {/* Modal chỉnh trạng thái đơn */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setEditingBooking(null);
        }}
        title="Chỉnh trạng thái đơn"
      >
        <div className="status-form">
          {editingBooking ? (
            <>
              <div className="form-group">
                <label>Trạng thái đơn:</label>
                <select
                  value={editingBooking.trang_thai || ''}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      trang_thai: e.target.value,
                    })
                  }
                >
                  <option value="">-- Chọn trạng thái --</option>
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="canceled">canceled</option>
                  <option value="received">received</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!editingBooking.is_paid}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        is_paid: e.target.checked,
                      })
                    }
                  />
                  <span>Đã thanh toán</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowStatusModal(false);
                    setEditingBooking(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    handleSaveStatus({
                      trang_thai: editingBooking.trang_thai,
                      is_paid: editingBooking.is_paid,
                    })
                  }
                >
                  Lưu
                </button>
              </div>
            </>
          ) : (
            <div>Không có đơn để chỉnh sửa</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Bookings;
