import React from 'react';
import './Dashboard.scss';

const Dashboard = () => {
  return (
    <div className="customer-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard - Admin Panel</h1>
        <p>Chào mừng đến với hệ thống quản lý Pickleball Bồ Đề</p>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <h3>Quản lý đặt sân</h3>
            <p>Xem và quản lý các đặt sân</p>
          </div>
          <div className="dashboard-card">
            <h3>Quản lý sân</h3>
            <p>Thêm, sửa, xóa thông tin sân</p>
          </div>
          <div className="dashboard-card">
            <h3>Quản lý dịch vụ</h3>
            <p>Quản lý các dịch vụ thêm</p>
          </div>
          <div className="dashboard-card">
            <h3>Báo cáo</h3>
            <p>Xem báo cáo doanh thu</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;