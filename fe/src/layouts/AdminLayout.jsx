import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.scss';
import appleImg from '../assets/apple.png';
import { FaSignInAlt, FaSignOutAlt, FaUser } from 'react-icons/fa';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    {
      path: '/admin',
      name: 'Báo cáo',
      icon: '📊',
      exact: true,
    },
    {
      path: '/admin/bookings',
      name: 'Đơn đặt',
      icon: '📅',
    },
    {
      path: '/admin/courts',
      name: 'Sân',
      icon: '🏓',
    },
    {
      path: '/admin/timeframes',
      name: 'Khung giờ',
      icon: '⏰',
    },
    {
      path: '/admin/services',
      name: 'Dịch vụ',
      icon: '🛎️',
    },
    {
      path: '/admin/customers',
      name: 'Khách hàng',
      icon: '👥',
    },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="mobile-overlay" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src={appleImg} alt="Apple" className="logo-icon" />
            <span className="logo-text">Pickleball Bồ Đề</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {menuItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${
                    isActive(item.path, item.exact) ? 'active' : ''
                  }`}
                  onClick={closeSidebar}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <span>{user?.full_name?.charAt(0) || 'A'}</span>
            </div>
            <div className="user-details">
              <div className="user-name">{user?.full_name || 'Admin'}</div>
              <div className="user-role">{user?.role || 'Administrator'}</div>
            </div>
          </div>
          <button onClick={logout} className="logout-btn" title="Đăng xuất">
            <FaSignOutAlt />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <button
            className="menu-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="mobile-title">
            <span className="logo-icon">🏓</span>
            Pickle Ball Admin
          </div>
        </div>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
