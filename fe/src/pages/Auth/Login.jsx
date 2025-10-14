import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Auth.scss';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({
        username: form.username,
        password: form.password,
      });
      const { token, user } = res.data.data;
      login(user, token);
      // Immediately route admin/manager/staff users to admin dashboard to avoid race with AuthContext state
      const role = user?.tenvaitro || user?.role;
      const code = user?.mavaitro || user?.role_id;
      const isAdminUser =
        role === 'admin' ||
        role === 'manager' ||
        role === 'staff' ||
        code === 1 ||
        code === 2 ||
        code === 3;

      if (isAdminUser) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Đăng nhập</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Tài khoản</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
          />
          <label>Mật khẩu</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Đang...' : 'Đăng nhập'}
          </button>
        </form>
        <div className="auth-footer">
          <span>Người mới? </span>
          <button className="link-btn" onClick={() => navigate('/register')}>
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
