import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Admin.scss';

const StatCard = ({ title, value, hint }) => (
  <div className="admin-card">
    <div className="admin-card__body">
      <div className="admin-card__title">{title}</div>
      <div className="admin-card__value">{value}</div>
      {hint && <div className="admin-card__hint">{hint}</div>}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    courts: 0,
    bookings: 0,
    timeframes: 0,
    customers: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, bRes, tRes] = await Promise.all([
          api.get('/courts').catch(() => ({ data: { data: [] } })),
          api.get('/bookings').catch(() => ({ data: { data: [] } })),
          api.get('/timeframes').catch(() => ({ data: { data: [] } })),
        ]);

        // customers endpoint may not exist yet; try safe call
        let custRes = { data: { data: [] } };
        try {
          custRes = await api.get('/customers');
        } catch (err) {
          console.warn('Customers endpoint not available', err?.message || err);
        }

        setCounts({
          courts: (cRes.data.data || []).length,
          bookings: (bRes.data.data || []).length,
          timeframes: (tRes.data.data || []).length,
          customers: (custRes.data.data || []).length,
        });
      } catch (err) {
        console.error('Load dashboard data error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading)
    return (
      <div className="admin-page">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">
          Tổng quan hệ thống quản lý sân pickleball
        </p>
      </div>

      <div className="dashboard-grid">
        <StatCard title="Số sân" value={counts.courts} hint="Quản lý sân" />
        <StatCard title="Đơn đặt" value={counts.bookings} hint="Đặt sân" />
        <StatCard
          title="Khung giờ"
          value={counts.timeframes}
          hint="Khung giờ & ca"
        />
        <StatCard
          title="Khách hàng"
          value={counts.customers}
          hint="Danh bạ khách"
        />
      </div>

      <section className="admin-section">
        <h2>Hoạt động gần đây</h2>
        <p className="muted">
          Hiện tại chưa có feed hoạt động — bạn có thể mở rộng phần này sau.
        </p>
      </section>
    </div>
  );
};

export default AdminDashboard;
