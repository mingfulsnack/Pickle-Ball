import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './AdminLogin.scss';

const AdminLogin = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      showError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login(formData);
      const { user, token } = response.data.data;

      // Check if user is admin
      const role = user?.tenvaitro || user?.role || null;
      const code = user?.mavaitro || user?.role_id || null;
      const isAdminUser =
        role === 'admin' ||
        role === 'manager' ||
        role === 'staff' ||
        code === 1 ||
        code === 2 ||
        code === 3;

      if (!isAdminUser) {
        showError('Access denied. Admin privileges required.');
        return;
      }

      login(user, token);
      showSuccess('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <h1>🏓 Pickleball Admin</h1>
          <p>Admin Panel Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Admin access only</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
