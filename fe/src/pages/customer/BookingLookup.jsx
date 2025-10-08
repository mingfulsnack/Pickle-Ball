import React, { useState } from 'react';
import api from '../../services/api';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './BookingLookup.scss';

const BookingLookup = () => {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
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

  // legacy lookup removed; fetching handled in useEffect

  return (
    <div className="booking-lookup-page">
      <div className="lookup-container">
        <h1>Lịch sử đặt sân của bạn</h1>

        {error && <div className="lookup-error">{error}</div>}

        <div className="lookup-result">
          {loading ? (
            <div>Đang tải...</div>
          ) : bookings.length === 0 ? (
            <div>Chưa có đặt sân nào</div>
          ) : (
            bookings.map((b) => {
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

                  <footer className="card-actions"></footer>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingLookup;
