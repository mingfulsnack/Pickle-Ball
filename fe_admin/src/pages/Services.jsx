import { useEffect, useState } from 'react';
import api from '../services/api';
import './Services.scss';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { showSuccess, showError, getErrorMessage } from '../utils/toast';

const emptyForm = {
  ma_dv: '',
  ten_dv: '',
  loai: 'rent',
  don_gia: 0,
  ghi_chu: '',
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      setServices(res.data.data || []);
    } catch (err) {
      console.error('Fetch services error', err);
      showError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc.id);
    setForm({
      ma_dv: svc.ma_dv || '',
      ten_dv: svc.ten_dv || svc.ten_dich_vu || '',
      loai: svc.loai || 'rent',
      don_gia: svc.don_gia || svc.don_gia || 0,
      ghi_chu: svc.ghi_chu || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này?')) return;
    try {
      await api.delete(`/services/${id}`);
      showSuccess('Xóa dịch vụ thành công');
      fetchServices();
    } catch (err) {
      console.error('Delete error', err);
      showError(getErrorMessage(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/services/${editing}`, form);
        showSuccess('Cập nhật dịch vụ thành công');
      } else {
        await api.post('/services', form);
        showSuccess('Tạo dịch vụ thành công');
      }

      setForm(emptyForm);
      setEditing(null);
      setModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error('Save service error', err);
      showError(getErrorMessage(err));
    }
  };

  return (
    <div className="admin-page services-page">
      <div className="page-header">
        <h1>Quản lý dịch vụ</h1>
        <p className="page-subtitle">Thêm, sửa hoặc xóa dịch vụ</p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={openCreate}>
          Tạo dịch vụ
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Đơn giá</th>
              <th>Ghi chú</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>
                  Không có dịch vụ
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.ten_dv || s.ten_dich_vu}</td>
                  <td style={{ textAlign: 'center' }}>
                    {(() => {
                    const normalize = (s) => {
                      if (!s) return '';
                      const key = String(s).toLowerCase();
                      return key;
                    };
                    const labels = {
                      rent: 'Thuê',
                      buy: 'Mua',
                    };
                    const key = normalize(s.loai);
                    const label = labels[key] || s.loai || '';
                    return (
                      <span className={`type ${key}`}>
                        {label}
                      </span>
                    );
                  })()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {Number(s.don_gia).toLocaleString('vi-VN')}đ
                  </td>
                  <td>{s.ghi_chu}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-sm"
                        onClick={() => openEdit(s)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(s.id)}
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="small"
      >
        <div className="admin-modal">
          <h3 className="modal-title">
            {editing ? 'Cập nhật dịch vụ' : 'Tạo dịch vụ mới'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mã dịch vụ</label>
              <input
                className="form-control"
                name="ma_dv"
                value={form.ma_dv}
                onChange={(e) => setForm({ ...form, ma_dv: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Tên dịch vụ</label>
              <input
                className="form-control"
                name="ten_dv"
                value={form.ten_dv}
                onChange={(e) => setForm({ ...form, ten_dv: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Loại</label>
              <select
                className="form-control"
                name="loai"
                value={form.loai}
                onChange={(e) => setForm({ ...form, loai: e.target.value })}
              >
                <option value="rent">rent</option>
                <option value="buy">buy</option>
              </select>
            </div>

            <div className="form-group">
              <label>Đơn giá</label>
              <input
                className="form-control"
                type="number"
                name="don_gia"
                value={form.don_gia}
                onChange={(e) =>
                  setForm({ ...form, don_gia: Number(e.target.value) })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Ghi chú</label>
              <textarea
                className="form-control"
                name="ghi_chu"
                value={form.ghi_chu}
                onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                Lưu
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
