import React, { useState } from 'react';
import api from '../../services/api';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './BookingLookup.scss';
import Modal from '../../components/Modal';
import { toast } from 'react-toastify';

const BookingLookup = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchMine = async () => {
      if (!isAuthenticated()) return;
      setLoading(true);
      try {
        const res = await api.get('/bookings/mine');
        setBookings(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || err.message || 'Lỗi khi tải lịch sử'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchMine();
  }, [isAuthenticated]);

  const handleCancelBooking = async (bookingId) => {
    // Open confirm modal instead
    setCancelTarget(bookingId);
    setShowCancelModal(true);
  };

  // modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const openDetail = async (b) => {
    try {
      setLoading(true);
      // fetch enriched booking details by ma_pd (public endpoint returns enriched services)
      const res = await api.get(`/public/bookings/${b.ma_pd}`);
      const payload = res.data.data || {};
      const booking = payload.booking || {};
      const services = payload.services || [];
      const slots = payload.slots || [];
      const totals = payload.totals || {};
      let finalServices = services;
      // fallback: if public payload has no services but booking id exists, try protected detail endpoint
      if ((!finalServices || finalServices.length === 0) && booking.id) {
        try {
          const authRes = await api.get(`/bookings/${booking.id}`);
          const authPayload = authRes.data.data || {};
          // auth endpoint returns { booking, slots, services }
          if (authPayload.services && authPayload.services.length > 0) {
            finalServices = authPayload.services;
          }
        } catch (e) {
          // ignore fallback errors
          console.debug('Fallback booking detail failed', e?.message || e);
        }
      }

      setSelectedBooking({
        ...booking,
        services: finalServices,
        slots,
        ...totals,
      });
    } catch (err) {
      console.error('Failed to load booking detail', err);
      toast.error('Không tải được chi tiết phiếu');
    } finally {
      setLoading(false);
    }
  };

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    setLoading(true);
    try {
      await api.put(`/bookings/${cancelTarget}/cancel`);
      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === cancelTarget ? { ...b, trang_thai: 'cancelled' } : b
        )
      );
      toast.success('Đã hủy đặt sân');
      setShowCancelModal(false);
      // if detail modal open for same booking, update it
      if (selectedBooking && selectedBooking.id === cancelTarget) {
        setSelectedBooking({ ...selectedBooking, trang_thai: 'cancelled' });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Hủy thất bại');
    } finally {
      setLoading(false);
      setCancelTarget(null);
    }
  };

  return (
    <div className="booking-lookup-page">
      <div className="lookup-container">
        <h1>Lịch sử đặt sân của bạn</h1>

        {error && <div className="lookup-error">{error}</div>}

        <div className="lookup-result">
          <div className="filters">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Tất cả
            </button>
            <button
              className={`filter-btn ${
                statusFilter === 'pending' ? 'active' : ''
              }`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${
                statusFilter === 'confirmed' ? 'active' : ''
              }`}
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed
            </button>
            <button
              className={`filter-btn ${
                statusFilter === 'cancelled' ? 'active' : ''
              }`}
              onClick={() => setStatusFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
          {loading ? (
            <div>Đang tải...</div>
          ) : bookings.length === 0 ? (
            <div>Chưa có đặt sân nào</div>
          ) : (
            // apply client-side filter
            bookings
              .filter((b) =>
                statusFilter === 'all'
                  ? true
                  : (b.trang_thai || '').toLowerCase() === statusFilter
              )
              .map((b) => {
                // derive display date/time from first slot if available
                const firstSlot =
                  b.slots && b.slots.length > 0 ? b.slots[0] : null;
                let formattedDate = '-';
                if (firstSlot && firstSlot.start_time) {
                  const d = new Date(b.ngay_su_dung || firstSlot.start_time);
                  formattedDate = d.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                }
                const slotRange = firstSlot
                  ? `${firstSlot.start_time.replace(
                      ':00',
                      ''
                    )} - ${firstSlot.end_time.replace(':00', '')}`
                  : '-';
                const currency = new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                  maximumFractionDigits: 0,
                });
                const total = b.tong_tien ? currency.format(b.tong_tien) : '-';

                return (
                  <article key={b.id} className="booking-card">
                    <header className="card-head">
                      <div className="code">{b.ma_pd}</div>
                      <div
                        className={`status badge-${b.trang_thai || 'pending'}`}
                      >
                        {b.trang_thai}
                      </div>
                    </header>

                    <div className="card-body">
                      <div className="body-row">
                        <div className="label">Ngày sử dụng</div>
                        <div className="value">{formattedDate}</div>
                      </div>
                      <div className="body-row">
                        <div className="label">Khung giờ</div>
                        <div className="value">{slotRange}</div>
                      </div>
                      <div className="body-row">
                        <div className="label">Tổng</div>
                        <div className="value total">{total}</div>
                      </div>
                    </div>

                    <footer className="card-actions">
                      <button
                        className="btn-secondary"
                        onClick={() => openDetail(b)}
                      >
                        Xem chi tiết
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={b.trang_thai !== 'pending'}
                      >
                        Hủy đặt
                      </button>
                    </footer>
                  </article>
                );
              })
          )}
        </div>

        {/* Detail Modal */}
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          size="large"
          title={
            selectedBooking ? `Phiếu đặt #${selectedBooking.ma_pd}` : 'Chi tiết'
          }
          closeOnBackdrop={true}
        >
          {selectedBooking && (
            <div className="booking-detail">
              <div className="detail-grid">
                <div className="box">
                  <h4>Thời gian</h4>
                  <p>
                    {new Date(selectedBooking.ngay_su_dung).toLocaleDateString(
                      'vi-VN'
                    )}{' '}
                    • {selectedBooking.slots?.[0]?.start_time || '-'} -{' '}
                    {selectedBooking.slots?.[0]?.end_time || '-'}
                  </p>
                  <h4>Sân</h4>
                  <p>{selectedBooking.slots?.[0]?.san_id || '-'}</p>
                  <h4>Người đặt</h4>
                  <p>
                    {selectedBooking.contact_name ||
                      selectedBooking.user_id ||
                      '-'}
                  </p>
                </div>
                <div className="box">
                  <h4>Tiền sân</h4>
                  <p>
                    {selectedBooking.tien_san
                      ? new Intl.NumberFormat('vi-VN').format(
                          selectedBooking.tien_san
                        ) + 'đ'
                      : '-'}
                  </p>
                  <h4>Dịch vụ</h4>
                  <div>
                    {selectedBooking.services &&
                    selectedBooking.services.length > 0 ? (
                      selectedBooking.services.map((s, i) => (
                        <div key={i}>
                          {(s.dv?.ten_dv || s.ten_dv || s.ten || s.name) +
                            ' : '}
                          {s.lineTotal
                            ? new Intl.NumberFormat('vi-VN').format(
                                s.lineTotal
                              ) + 'đ'
                            : s.so_luong && s.don_gia
                            ? new Intl.NumberFormat('vi-VN').format(
                                s.so_luong * s.don_gia
                              ) + 'đ'
                            : '-'}
                        </div>
                      ))
                    ) : selectedBooking.tien_dich_vu ? (
                      <div>
                        Tổng tiền dịch vụ:{' '}
                        {new Intl.NumberFormat('vi-VN').format(
                          selectedBooking.tien_dich_vu
                        )}
                        đ
                      </div>
                    ) : (
                      <div>-</div>
                    )}
                  </div>
                  <hr />
                  <h4>Tổng tiền</h4>
                  <p>
                    {selectedBooking.tong_tien
                      ? new Intl.NumberFormat('vi-VN').format(
                          selectedBooking.tong_tien
                        ) + 'đ'
                      : '-'}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: '12px' }}>
                <button
                  className="btn-danger"
                  onClick={() => {
                    setShowCancelModal(true);
                    setCancelTarget(selectedBooking.id);
                  }}
                >
                  Hủy đặt sân
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Cancel Confirm Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setCancelTarget(null);
          }}
          size="small"
          title="Xác nhận hủy"
        >
          <div style={{ padding: '8px 0' }}>Bạn có muốn hủy đặt sân không?</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '12px',
            }}
          >
            <button
              className="btn-secondary"
              onClick={() => {
                setShowCancelModal(false);
                setCancelTarget(null);
              }}
            >
              Không
            </button>
            <button className="btn-primary" onClick={confirmCancelBooking}>
              Có
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default BookingLookup;
