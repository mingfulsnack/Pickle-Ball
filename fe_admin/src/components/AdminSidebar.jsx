import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.scss';
import appleImg from '../assets/apple.png';

const AdminSidebar = () => {
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
    {
      path: '/admin/employees',
      icon: '👨‍💼',
      label: 'Quản lý nhân viên',
    },
  ];

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img src={appleImg} alt="Apple" className="logo-icon" />
          <div className="logo-text">
            <h3>Pickleball Bồ Đề</h3>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-details">
            <h4>{user?.hoten || user?.full_name || 'Admin'}</h4>
            <p>{user?.tenvaitro || user?.role || 'Administrator'}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
