import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Auth.scss';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    passwordConfirm: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // basic client-side validation
    if (!form.firstName || !form.lastName) {
      alert('Vui lòng nhập họ và tên');
      setLoading(false);
      return;
    }
    if (!form.username) {
      alert('Vui lòng chọn tài khoản (username)');
      setLoading(false);
      return;
    }
    if (!form.password || form.password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }
    if (form.password !== form.passwordConfirm) {
      alert('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        username: form.username,
        password: form.password,
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone,
      };
      await authAPI.register(payload);
      alert('Đăng ký thành công. Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register">
        <h2>Đăng ký</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="row">
            <div>
              <label>Họ</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Tên</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <label>Email</label>
          <input name="email" value={form.email} onChange={handleChange} />

          <label>Số điện thoại (Lựa chọn)</label>
          <input name="phone" value={form.phone} onChange={handleChange} />

          <label>Tài khoản (username)</label>
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

          <label>Xác nhận mật khẩu</label>
          <input
            type="password"
            name="passwordConfirm"
            value={form.passwordConfirm}
            onChange={handleChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Đang...' : 'Đăng ký'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
