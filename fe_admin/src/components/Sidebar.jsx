import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.scss';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: '📊',
      label: 'Dashboard',
    },
    {
      path: '/admin/bookings',
      icon: '📅',
      label: 'Đơn đặt sân',
    },
    {
      path: '/admin/courts',
      icon: '🏓',
      label: 'Quản lý sân',
    },
    {
      path: '/admin/timeframes',
      icon: '⏰',
      label: 'Khung giờ',
    },
    {
      path: '/admin/services',
      icon: '🛎️',
      label: 'Dịch vụ',
    },
    {
      path: '/admin/customers',
      icon: '👥',
      label: 'Khách hàng',
    },
  ];

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🏓</span>
          <span className="logo-text">Pickleball Admin</span>
        </div>
      </div>

      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {(user?.full_name || user?.username || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">
              {user?.full_name || user?.username || 'Admin'}
            </div>
            <div className="user-role">
              {user?.tenvaitro || user?.role || 'Administrator'}
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
