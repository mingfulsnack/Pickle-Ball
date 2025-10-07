import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSignInAlt, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Header.scss';

const Header = ({ isPublic = false }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    console.log('Logging out user...');
    logout(); // AuthContext sẽ tự handle redirect
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className={`header ${isPublic ? 'public' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          {/* Logo */}
          <div className="logo" onClick={() => handleNavigation('/')}>
            <div className="logo-icon">🍎</div>
            <span className="logo-text">Pickleball Bồ Đề</span>
          </div>
          
          {/* Navigation Menu (only for public layout) */}
          {isPublic && (
            <nav className="main-nav">
              <ul className="nav-list">
                <li className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                  <button onClick={() => handleNavigation('/')}>
                    Trang chủ
                  </button>
                </li>
                <li className={`nav-item ${isActive('/booking-history') ? 'active' : ''}`}>
                  <button onClick={() => handleNavigation('/booking-history')}>
                    Lịch sử đặt sân
                  </button>
                </li>
                <li className={`nav-item ${isActive('/about') ? 'active' : ''}`}>
                  <button onClick={() => handleNavigation('/about')}>
                    Giới thiệu
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>

        <div className="header-right">
          {isAuthenticated() ? (
            <div className="user-menu">
              <div className="user-info">
                <FaUser className="user-icon" />
                <span className="user-name">{user?.full_name || user?.username || 'User'}</span>
              </div>
              <button
                className="btn btn-secondary logout-btn"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <button className="btn btn-primary login-btn" onClick={handleLogin}>
              <FaSignInAlt />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
