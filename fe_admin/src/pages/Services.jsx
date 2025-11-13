import { useEffect, useState } from 'react';
import api from '../services/api';
import './Services.scss';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { showSuccess, showError, getErrorMessage } from '../utils/toast';

const emptyForm = {
  ma_dv: '',
  ten_dv: '',
  loai: 'rent',
  don_gia: 0,
  ghi_chu: '',
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);

  // Add Services to Booking modal states
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [bookingSearch, setBookingSearch] = useState({
    name: '',
    phone: '',
  });
  const [searchedBookings, setSearchedBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedServicesForBooking, setSelectedServicesForBooking] = useState(
    []
  );
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      setServices(res.data.data || []);
    } catch (err) {
      console.error('Fetch services error', err);
      showError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc.id);
    setForm({
      ma_dv: svc.ma_dv || '',
      ten_dv: svc.ten_dv || svc.ten_dich_vu || '',
      loai: svc.loai || 'rent',
      don_gia: svc.don_gia || svc.don_gia || 0,
      ghi_chu: svc.ghi_chu || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này?')) return;
    try {
      await api.delete(`/services/${id}`);
      showSuccess('Xóa dịch vụ thành công');
      fetchServices();
    } catch (err) {
      console.error('Delete error', err);
      showError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/services/${editing}`, form);
        showSuccess('Cập nhật dịch vụ thành công');
      } else {
        await api.post('/services', form);
        showSuccess('Tạo dịch vụ thành công');
      }

      setForm(emptyForm);
      setEditing(null);
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error('Save service error', err);
      showError(getErrorMessage(err));
    }
  };

  const searchBookings = async () => {
    const { name, phone } = bookingSearch;
    if (!name && !phone) {
      showError('Vui lòng nhập tên hoặc số điện thoại để tìm kiếm');
      return;
    }

    setSearchLoading(true);
    try {
      // backend expects search_name and search_phone
      const params = {};
      if (name) params.search_name = name;
      if (phone) params.search_phone = phone;

      const res = await api.get('/bookings', { params });
      // backend returns { data: { bookings: [...], pagination: {...} } }
      const payload = res.data && res.data.data ? res.data.data : null;
      let allBookings = [];
      if (payload) {
        if (Array.isArray(payload)) allBookings = payload;
        else if (Array.isArray(payload.bookings))
          allBookings = payload.bookings;
        else if (Array.isArray(payload.data)) allBookings = payload.data; // fallback
      }

      // Filter out cancelled bookings (if any)
      const activeBookings = allBookings.filter(
        (b) => String(b.trang_thai || '').toLowerCase() !== 'cancelled'
      );
      setSearchedBookings(activeBookings);
    } catch (err) {
      console.error('Search bookings error', err);
      showError(getErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleServiceToggleForBooking = (serviceId) => {
    const existing = selectedServicesForBooking.find(
      (s) => s.dich_vu_id === serviceId
    );
    if (existing) {
      setSelectedServicesForBooking(
        selectedServicesForBooking.filter((s) => s.dich_vu_id !== serviceId)
      );
    } else {
      setSelectedServicesForBooking([
        ...selectedServicesForBooking,
        { dich_vu_id: serviceId, so_luong: 1 },
      ]);
    }
  };

  const handleServiceQuantityChange = (serviceId, quantity) => {
    setSelectedServicesForBooking(
      selectedServicesForBooking.map((s) =>
        s.dich_vu_id === serviceId ? { ...s, so_luong: quantity } : s
      )
    );
  };

  const handleAddServicesToBooking = async () => {
    if (!selectedBooking) {
      showError('Vui lòng chọn đơn đặt sân');
      return;
    }
    if (selectedServicesForBooking.length === 0) {
      showError('Vui lòng chọn ít nhất một dịch vụ');
      return;
    }

    try {
      await api.post(`/bookings/${selectedBooking.id}/services`, {
        services: selectedServicesForBooking,
      });
      showSuccess('Thêm dịch vụ vào đơn đặt thành công');
      resetAddServiceModal();
    } catch (err) {
      console.error('Add services to booking error', err);
      showError(getErrorMessage(err));
    }
  };

  const resetAddServiceModal = () => {
    setAddServiceModalOpen(false);
    setBookingSearch({ name: '', phone: '' });
    setSearchedBookings([]);
    setSelectedBooking(null);
    setSelectedServicesForBooking([]);
  };

  return (
    <div className="admin-page services-page">
      <div className="page-header">
        <h1>Quản lý dịch vụ</h1>
        <p className="page-subtitle">Thêm, sửa hoặc xóa dịch vụ</p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={openCreate}>
          Tạo dịch vụ
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setAddServiceModalOpen(true)}
          style={{ marginLeft: '1rem' }}
        >
          Thêm dịch vụ vào đơn
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Đơn giá</th>
              <th>Ghi chú</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>
                  Không có dịch vụ
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.ten_dv || s.ten_dich_vu}</td>
                  <td style={{ textAlign: 'center' }}>
                    {(() => {
                      const normalize = (s) => {
                        if (!s) return '';
                        const key = String(s).toLowerCase();
                        return key;
                      };
                      const labels = {
                        rent: 'Thuê',
                        buy: 'Mua',
                      };
                      const key = normalize(s.loai);
                      const label = labels[key] || s.loai || '';
                      return <span className={`type ${key}`}>{label}</span>;
                    })()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {Number(s.don_gia).toLocaleString('vi-VN')}đ
                  </td>
                  <td>{s.ghi_chu}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-sm"
                        onClick={() => openEdit(s)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(s.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="small"
      >
        <div className="admin-modal">
          <h3 className="modal-title">
            {editing ? 'Cập nhật dịch vụ' : 'Tạo dịch vụ mới'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mã dịch vụ</label>
              <input
                className="form-control"
                name="ma_dv"
                value={form.ma_dv}
                onChange={(e) => setForm({ ...form, ma_dv: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Tên dịch vụ</label>
              <input
                className="form-control"
                name="ten_dv"
                value={form.ten_dv}
                onChange={(e) => setForm({ ...form, ten_dv: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Loại</label>
              <select
                className="form-control"
                name="loai"
                value={form.loai}
                onChange={(e) => setForm({ ...form, loai: e.target.value })}
              >
                <option value="rent">rent</option>
                <option value="buy">buy</option>
              </select>
            </div>

            <div className="form-group">
              <label>Đơn giá</label>
              <input
                className="form-control"
                type="number"
                name="don_gia"
                value={form.don_gia}
                onChange={(e) =>
                  setForm({ ...form, don_gia: Number(e.target.value) })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Ghi chú</label>
              <textarea
                className="form-control"
                name="ghi_chu"
                value={form.ghi_chu}
                onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                Lưu
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal: Thêm dịch vụ vào đơn */}
      <Modal
        isOpen={addServiceModalOpen}
        onClose={resetAddServiceModal}
        size="large"
      >
        <div className="admin-modal add-service-to-booking-modal">
          <h3 className="modal-title">Thêm dịch vụ vào đơn đặt sân</h3>

          {/* Step 1: Search for booking */}
          <div className="booking-search-section">
            <h4>1. Tìm đơn đặt sân</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Tên khách hàng:</label>
                <input
                  className="form-control"
                  type="text"
                  value={bookingSearch.name}
                  onChange={(e) =>
                    setBookingSearch({ ...bookingSearch, name: e.target.value })
                  }
                  placeholder="Nhập tên khách hàng..."
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại:</label>
                <input
                  className="form-control"
                  type="text"
                  value={bookingSearch.phone}
                  onChange={(e) =>
                    setBookingSearch({
                      ...bookingSearch,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Nhập số điện thoại..."
                />
              </div>
              <div className="form-group">
                <button
                  className="btn btn-primary"
                  onClick={searchBookings}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>
              </div>
            </div>

            {/* Booking results */}
            {searchedBookings.length > 0 && (
              <div className="booking-results">
                <h5>Kết quả tìm kiếm ({searchedBookings.length} đơn):</h5>
                <div className="bookings-list">
                  {searchedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={`booking-item ${
                        selectedBooking?.id === booking.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <div className="booking-info">
                        <strong>{booking.ma_pd || `#${booking.id}`}</strong>
                        <span>
                          {booking.contact_name || booking.user_id} -{' '}
                          {booking.contact_phone || booking.phone || '-'}
                        </span>
                        <span className="booking-date">
                          {(() => {
                            try {
                              return new Date(booking.ngay_su_dung)
                                .toISOString()
                                .split('T')[0]
                                .split('-')
                                .reverse()
                                .join('/');
                            } catch {
                              return booking.ngay_su_dung;
                            }
                          })()}
                        </span>
                        <span className="booking-total">
                          {Number(booking.tong_tien || 0).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Select services */}
          {selectedBooking && (
            <div className="service-selection-section">
              <h4>2. Chọn dịch vụ</h4>
              <div className="services-grid">
                {services.map((service) => {
                  const selected = selectedServicesForBooking.find(
                    (s) => s.dich_vu_id === service.id
                  );
                  return (
                    <div
                      key={service.id}
                      className={`service-card ${selected ? 'selected' : ''}`}
                    >
                      <div className="service-header">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() =>
                            handleServiceToggleForBooking(service.id)
                          }
                        />
                        <span className="service-name">
                          {service.ten_dv || service.ten_dich_vu}
                        </span>
                      </div>
                      <div className="service-details">
                        <span className="service-type">
                          {(() => {
                            const loai = String(service.loai || '')
                              .toLowerCase()
                              .trim();
                            return loai === 'rent' ? 'Thuê' : 'Mua';
                          })()}
                        </span>
                        <span className="service-price">
                          {Number(service.don_gia || 0).toLocaleString('vi-VN')}
                          đ
                        </span>
                      </div>
                      {selected && (
                        <div className="service-quantity">
                          <label>Số lượng:</label>
                          <input
                            type="number"
                            min="1"
                            value={selected.so_luong}
                            onChange={(e) =>
                              handleServiceQuantityChange(
                                service.id,
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={resetAddServiceModal}
            >
              Hủy
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleAddServicesToBooking}
              disabled={
                !selectedBooking || selectedServicesForBooking.length === 0
              }
            >
              Thêm dịch vụ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
