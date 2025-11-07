import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import toast from '../utils/toast';
import './Employees.scss';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        username: employee.username || '',
        password: '', // Don't prefill password
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        username: '',
        password: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      username: '',
      password: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.full_name || !formData.phone) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!editingEmployee && !formData.username) {
      toast.error('Vui lòng nhập tên đăng nhập');
      return;
    }

    if (!editingEmployee && !formData.password) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    try {
      if (editingEmployee) {
        // Update existing employee
        const updateData = {
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone,
        };

        // Only include password if user entered a new one
        if (formData.password) {
          updateData.password = formData.password;
        }

        await api.put(`/employees/${editingEmployee.id}`, updateData);
        toast.success('Cập nhật nhân viên thành công');
      } else {
        // Create new employee with role = staff
        await api.post('/employees', {
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email || null,
          phone: formData.phone,
          password: formData.password,
        });
        toast.success('Thêm nhân viên mới thành công');
      }

      handleCloseModal();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      const errorMsg =
        error.response?.data?.message || 'Có lỗi xảy ra khi lưu nhân viên';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, fullName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân viên "${fullName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Xóa nhân viên thành công');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Không thể xóa nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page employees-page">
      <div className="page-header">
        <h1>Quản lý nhân viên</h1>
        <p className="page-subtitle">Theo dõi và quản lý danh sách nhân viên</p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Thêm nhân viên
        </button>

        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="loading">Đang tải...</div>}

      {!loading && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Họ tên</th>
              <th>Tên đăng nhập</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>
                  {searchTerm
                    ? 'Không tìm thấy nhân viên'
                    : 'Chưa có nhân viên nào'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.id}</td>
                  <td>{employee.full_name || '—'}</td>
                  <td>{employee.username}</td>
                  <td>{employee.email || '—'}</td>
                  <td>{employee.phone || '—'}</td>
                  <td>
                    {employee.created_at
                      ? new Date(employee.created_at).toLocaleDateString(
                          'vi-VN'
                        )
                      : '—'}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-sm"
                        onClick={() => handleOpenModal(employee)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() =>
                          handleDelete(employee.id, employee.full_name)
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {filteredEmployees.length === 0 && !loading && (
        <div className="empty-state">
          <p>Không có nhân viên nào</p>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          title={
            editingEmployee ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên mới'
          }
          onClose={handleCloseModal}
        >
          <form onSubmit={handleSubmit} className="employee-form">
            <div className="form-group">
              <label>
                Họ tên <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Nhập họ tên đầy đủ"
                required
              />
            </div>

            {!editingEmployee && (
              <div className="form-group">
                <label>
                  Tên đăng nhập <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="Nhập tên đăng nhập"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label>
                Số điện thoại <span className="required">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="0912345678"
                required
              />
            </div>

            <div className="form-group">
              <label>
                Mật khẩu{' '}
                {!editingEmployee && <span className="required">*</span>}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={
                  editingEmployee
                    ? 'Để trống nếu không đổi mật khẩu'
                    : 'Nhập mật khẩu'
                }
                required={!editingEmployee}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseModal}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? 'Đang lưu...'
                  : editingEmployee
                  ? 'Cập nhật'
                  : 'Thêm mới'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Employees;
