import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminSidebar.scss';
import appleImg from '../assets/apple.png';

const AdminSidebar = () => {
  const { user, logout, canEdit } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allMenuItems = [
    {
      path: '/admin/dashboard',
      icon: '📊',
      label: 'Dashboard',
      allowStaff: true,
    },
    {
      path: '/admin/bookings',
      icon: '📅',
      label: 'Đơn đặt sân',
      allowStaff: true,
    },
    {
      path: '/admin/courts',
      icon: '🏓',
      label: 'Quản lý sân',
      allowStaff: false,
    },
    {
      path: '/admin/timeframes',
      icon: '⏰',
      label: 'Khung giờ',
      allowStaff: false,
    },
    {
      path: '/admin/services',
      icon: '🛎️',
      label: 'Dịch vụ',
      allowStaff: true,
    },
    {
      path: '/admin/court-status',
      icon: '📍',
      label: 'Tình trạng sân',
      allowStaff: true,
    },
    {
      path: '/admin/customers',
      icon: '👥',
      label: 'Khách hàng',
      allowStaff: true,
    },
    {
      path: '/admin/employees',
      icon: '👨‍💼',
      label: 'Quản lý nhân viên',
      allowStaff: false,
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (canEdit()) return true; // Admin/Manager can see all
    return item.allowStaff; // Staff can only see allowed items
  });

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
