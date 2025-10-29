import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import toast from '../../utils/toast';
import './Customers.scss';

const Customers = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const res = await api.get('/customers', { params });
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error('Fetch customers error', err);
      toast.error('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  // Live search: fetch when searchTerm changes with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleSearch = () => {
    fetchCustomers();
  };

  const handleCreateCustomer = async () => {
    try {
      if (
        !formData.full_name.trim() ||
        !formData.phone.trim() ||
        !formData.email.trim()
      ) {
        toast.error('Vui lòng nhập đầy đủ thông tin');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Email không đúng định dạng');
        return;
      }

      // Validate phone format (Vietnamese phone number)
      //   const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
      //   if (!phoneRegex.test(formData.phone)) {
      //     toast.error('Số điện thoại không đúng định dạng');
      //     return;
      //   }

      // backend validation expects `ho_ten` and `sdt` keys
      await api.post('/customers', {
        ho_ten: formData.full_name,
        sdt: formData.phone,
        email: formData.email,
      });
      toast.success('Tạo khách hàng thành công');
      setShowModal(false);
      resetForm();
      fetchCustomers();
    } catch (err) {
      console.error('Create customer error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi tạo khách hàng');
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      if (!formData.full_name.trim() || !formData.phone.trim()) {
        toast.error('Vui lòng nhập đầy đủ tên và số điện thoại');
        return;
      }

      // Validate phone format
      //   const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
      //   if (!phoneRegex.test(formData.phone)) {
      //     toast.error('Số điện thoại không đúng định dạng');
      //     return;
      //   }

      // backend expects `ho_ten` and `sdt` for customer updates
      await api.put(`/customers/${editingCustomer.id}`, {
        ho_ten: formData.full_name,
        sdt: formData.phone,
      });

      toast.success('Cập nhật khách hàng thành công');
      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (err) {
      console.error('Update customer error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật khách hàng');
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (
      !window.confirm(`Bạn có chắc muốn xóa khách hàng "${customer.ho_ten}"?`)
    ) {
      return;
    }

    try {
      await api.delete(`/customers/${customer.id}`);
      toast.success('Xóa khách hàng thành công');
      fetchCustomers();
    } catch (err) {
      console.error('Delete customer error', err);
      toast.error(err.response?.data?.message || 'Lỗi khi xóa khách hàng');
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.ho_ten,
      phone: customer.sdt,
      email: customer.email || '', // Email is read-only in edit mode
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // initial data load handled by debounce effect (searchTerm initially empty)

  return (
    <div className="admin-page customers-page">
      <div className="page-header">
        <h1>Quản lý khách hàng</h1>
        <p className="page-subtitle">
          Theo dõi và quản lý danh sách khách hàng
        </p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={openCreateModal}>
          ➕ Thêm khách hàng
        </button>

        <div className="search-container">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-secondary" onClick={handleSearch}>
            🔍 Tìm kiếm
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên khách hàng</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th>Ngày cập nhật</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.ho_ten}</td>
                <td>{customer.sdt}</td>
                <td>{customer.email || '-'}</td>
                <td>
                  {customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString('vi-VN')
                    : '-'}
                </td>
                <td>
                  {customer.updated_at
                    ? new Date(customer.updated_at).toLocaleString('vi-VN')
                    : '-'}
                </td>
                <td>
                  <div className="actions-cell">
                    <button
                      className="btn btn-sm"
                      onClick={() => openEditModal(customer)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteCustomer(customer)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {customers.length === 0 && !loading && (
        <div className="empty-state">
          <p>Không có khách hàng nào</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomer(null);
          resetForm();
        }}
        title={
          editingCustomer ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới'
        }
      >
        <div className="customer-form">
          <div className="form-group">
            <label>Tên khách hàng *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Nhập tên khách hàng"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại *</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Nhập số điện thoại"
              className="form-control"
            />
          </div>

          {!editingCustomer && (
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Nhập email"
                className="form-control"
              />
            </div>
          )}

          {editingCustomer && (
            <div className="form-group">
              <label>Email (không thể sửa)</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="form-control"
              />
            </div>
          )}

          {!editingCustomer && (
            <div className="form-note">
              <p>
                <strong>Lưu ý:</strong>
              </p>
              <ul>
                <li>Email sẽ được dùng làm tên đăng nhập</li>
                <li>Số điện thoại sẽ được dùng làm mật khẩu mặc định</li>
                <li>Khách hàng có thể đổi mật khẩu sau khi đăng nhập</li>
              </ul>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowModal(false);
                setEditingCustomer(null);
                resetForm();
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={
                editingCustomer ? handleUpdateCustomer : handleCreateCustomer
              }
            >
              {editingCustomer ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
