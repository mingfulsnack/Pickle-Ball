import React, { useState, useEffect } from 'react';
import api, { publicApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Modal from '../../components/Modal';
import {
  FaTicketAlt,
  FaTimes,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaCalendarAlt,
} from 'react-icons/fa';
import './BookingLookup.scss';
import LoadingSpinner from '../../components/LoadingSpinner';

const BookingLookup = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = useAuth();

  // State for modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBookings = async () => {
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

  useEffect(() => {
    fetchBookings();
  }, [isAuthenticated]);

  const handleOpenDetail = async (booking) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      // Use the public endpoint that returns enriched data
      const res = await publicApi.get(`/public/bookings/${booking.ma_pd}`);
      setSelectedBooking(res.data.data);
    } catch (err) {
      toast.error('Không thể tải chi tiết phiếu đặt.');
      console.error(err);
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedBooking(null);
  };

  const handleOpenCancel = () => {
    setIsDetailOpen(false); // Close detail modal before opening cancel modal
    setIsCancelOpen(true);
  };

  const handleCloseCancel = () => {
    setIsCancelOpen(false);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;
    setLoading(true);
    handleCloseCancel();
    let ma_pd = null;
    try {
      // Determine ma_pd: selectedBooking might be either raw booking from list or detailed payload
      ma_pd = selectedBooking.booking
        ? selectedBooking.booking.ma_pd
        : selectedBooking.ma_pd;
      if (!ma_pd) throw new Error('Missing booking token');
      // normalize: trim and remove leading hash if present
      ma_pd = String(ma_pd).trim().replace(/^#/, '').trim();
      console.debug('Cancel ma_pd:', ma_pd);
      const url = `/public/bookings/${ma_pd}/cancel`;
      console.debug('Cancel URL:', url);
      // Use publicApi (no auth needed for token) to cancel
      await publicApi.put(url, {
        reason: 'Customer cancellation from lookup page',
      });
      toast.success('Hủy đặt sân thành công!');
      fetchBookings(); // Refresh the list
    } catch (err) {
      console.error('Cancel error', err);
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.debug('Cancel response status/data', status, data);
      let msg = 'Có lỗi xảy ra khi hủy đặt sân.';
      if (status === 404) {
        msg = `Không tìm thấy phiếu đặt (ma_pd=${ma_pd}). Vui lòng kiểm tra mã.`;
      } else if (data?.message) {
        msg = data.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
      setSelectedBooking(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chưa nhận sân';
      case 'confirmed':
        return 'Đã nhận sân';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  return (
    <div className="booking-lookup-page">
      <div className="lookup-container">
        <h1>Lịch sử đặt sân</h1>
        {error && <div className="lookup-error">{error}</div>}
        <div className="lookup-result">
          {loading ? (
            <LoadingSpinner />
          ) : bookings.length === 0 ? (
            <div>Bạn chưa có đặt sân nào.</div>
          ) : (
            bookings.map((b) => (
              <article key={b.id} className="booking-card">
                <header className="card-head">
                  <div className="code">#{b.ma_pd}</div>
                  <div className={`status badge-${b.trang_thai || 'pending'}`}>
                    {getStatusText(b.trang_thai)}
                  </div>
                </header>
                <div className="card-body">
                  <div className="body-row">
                    <div className="label">Ngày</div>
                    <div className="value">{formatDate(b.ngay_su_dung)}</div>
                  </div>
                  <div className="body-row">
                    <div className="label">Giờ</div>
                    <div className="value">
                      {b.slots && b.slots.length > 0
                        ? `${formatTime(b.slots[0].start_time)} - ${formatTime(
                            b.slots[0].end_time
                          )}`
                        : '-'}
                    </div>
                  </div>
                  <div className="body-row">
                    <div className="label">Tổng tiền</div>
                    <div className="value total">
                      {b.tong_tien ? Number(b.tong_tien).toLocaleString() : '0'}
                      đ
                    </div>
                  </div>
                </div>
                <footer className="card-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => handleOpenDetail(b)}
                  >
                    Xem chi tiết
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      // open cancel modal for this booking (list item)
                      setSelectedBooking(b);
                      setIsCancelOpen(true);
                    }}
                    disabled={b.trang_thai !== 'pending'}
                    title={
                      b.trang_thai === 'pending'
                        ? 'Hủy đặt'
                        : 'Chỉ có thể hủy khi phiếu ở trạng thái Chưa nhận sân'
                    }
                  >
                    Hủy đặt
                  </button>
                </footer>
              </article>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={handleCloseDetail} size="large">
        <div className="booking-detail-modal">
          {detailLoading ? (
            <LoadingSpinner />
          ) : (
            selectedBooking &&
            (() => {
              const detail = selectedBooking;
              const bookingObj = detail.booking || detail;
              const slots = detail.slots || bookingObj.slots || [];
              const services = detail.services || [];
              const totals = detail.totals || detail || {};

              return (
                <>
                  <div className="modal-custom-header">
                    <FaTicketAlt className="header-icon" />
                    <h2>Chi tiết phiếu đặt sân</h2>
                    <button onClick={handleCloseDetail} className="close-btn">
                      <FaTimes />
                    </button>
                  </div>
                  <div className="modal-custom-body">
                    <div className="booking-id-header">
                      <h3>Phiếu đặt #{bookingObj.ma_pd}</h3>
                      <span
                        className={`status-badge status-${bookingObj.trang_thai}`}
                      >
                        <FaCalendarAlt /> {getStatusText(bookingObj.trang_thai)}
                      </span>
                    </div>
                    <div className="detail-grid">
                      <div className="info-section">
                        <p>
                          <strong>Thời gian</strong>
                          <br />
                          {bookingObj.ngay_su_dung
                            ? formatDate(bookingObj.ngay_su_dung)
                            : ''}{' '}
                          ●{' '}
                          {slots.length > 0
                            ? `${formatTime(
                                slots[0].start_time
                              )} - ${formatTime(slots[0].end_time)}`
                            : ''}
                        </p>
                        <p>
                          <strong>Sân</strong>
                          <br />
                          {slots.length > 0 ? `Sân ${slots[0].san_id}` : ''} -
                          Sân vận động Bồ Đề
                        </p>
                        <p>
                          <strong>Người đặt</strong>
                          <br />
                          {bookingObj.contact_name || user?.full_name || '-'}
                        </p>
                        <hr />
                        <p className="location-info">
                          <FaMapMarkerAlt /> 237 Phú Viên, Bồ Đề, Long Biên
                        </p>
                        <p className="note-info">
                          <FaInfoCircle /> Hãy đến sớm 10 phút để thực hiện thủ
                          tục nhận sân ở cửa trước
                        </p>
                      </div>
                      <div className="pricing-section">
                        <p>
                          <span>Tiền sân:</span>{' '}
                          <span>
                            {totals.tien_san
                              ? Number(totals.tien_san).toLocaleString() + 'đ'
                              : '0đ'}
                          </span>
                        </p>
                        <p>
                          <span>Dịch vụ:</span>
                        </p>
                        {services && services.length > 0 ? (
                          services.map((s) => (
                            <p
                              className="service-item"
                              key={s.id || s.dich_vu_id}
                            >
                              <span>
                                - {s.dv?.ten_dv || s.ten_dv || s.ten || s.name}{' '}
                                x{s.so_luong || s.quantity || 1}:
                              </span>{' '}
                              <span>
                                {s.lineTotal
                                  ? Number(s.lineTotal).toLocaleString() + 'đ'
                                  : s.so_luong && s.don_gia
                                  ? Number(
                                      s.so_luong * s.don_gia
                                    ).toLocaleString() + 'đ'
                                  : '0đ'}
                              </span>
                            </p>
                          ))
                        ) : (
                          <p className="service-item">
                            <span>- Không có</span>
                            <span>0đ</span>
                          </p>
                        )}
                        <p>
                          <span>Phương thức thanh toán:</span>{' '}
                          <span>Trả sau</span>
                        </p>
                        <hr />
                        <p className="total">
                          <span>Tổng tiền:</span>{' '}
                          <span>
                            {totals.tong_tien
                              ? Number(totals.tong_tien).toLocaleString() + 'đ'
                              : '0đ'}
                          </span>
                        </p>
                      </div>
                    </div>
                    {bookingObj.trang_thai === 'pending' && (
                      <div className="modal-actions">
                        <button
                          className="btn-cancel-main"
                          onClick={handleOpenCancel}
                        >
                          Hủy đặt sân
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()
          )}
        </div>
      </Modal>

      {/* Cancel Confirm Modal */}
      <Modal isOpen={isCancelOpen} onClose={handleCloseCancel} size="small">
        <div className="cancel-confirm-modal">
          <p>Bạn có muốn hủy đặt sân không?</p>
          <div className="confirm-actions">
            <button className="btn-yes" onClick={handleConfirmCancel}>
              Có
            </button>
            <button className="btn-no" onClick={handleCloseCancel}>
              Không
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingLookup;
