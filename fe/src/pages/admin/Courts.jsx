import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import './Admin.scss';

const emptyForm = { ma_san: '', ten_san: '', suc_chua: 4, ghi_chu: '' };

const Courts = () => {
  const [loading, setLoading] = useState(false);
  const [courts, setCourts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/courts');
      setCourts(res.data.data || []);
    } catch (err) {
      console.error('Fetch courts error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (court) => {
    setEditing(court);
    setForm({
      ma_san: court.ma_san || '',
      ten_san: court.ten_san || '',
      suc_chua: court.suc_chua || 4,
      ghi_chu: court.ghi_chu || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (court) => {
    if (!confirm(`Bạn có chắc muốn xóa sân ${court.ten_san || court.ma_san}?`))
      return;
    try {
      await api.delete(`/courts/${court.id}`);
      fetchCourts();
    } catch (err) {
      console.error('Delete court error', err);
      alert(err.response?.data?.message || 'Xóa sân thất bại');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/courts/${editing.id}`, form);
      } else {
        await api.post('/courts', form);
      }
      setIsModalOpen(false);
      fetchCourts();
    } catch (err) {
      console.error('Save court error', err);
      alert(err.response?.data?.message || 'Lưu thông tin sân thất bại');
    }
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Quản lý sân</h1>
        <p className="page-subtitle">
          Thiết lập và bảo trì thông tin các sân pickleball
        </p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={openCreate}>
          ➕ Tạo sân mới
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã sân</th>
              <th>Tên</th>
              <th>Sức chứa</th>
              <th>Ghi chú</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courts.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.ma_san}</td>
                <td>{c.ten_san}</td>
                <td>{c.suc_chua}</td>
                <td>{c.ghi_chu}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => openEdit(c)}>
                    Sửa
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(c)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="small"
      >
        <div className="admin-modal">
          <h3>{editing ? 'Sửa sân' : 'Tạo sân mới'}</h3>
          <form onSubmit={handleSubmit}>
            <label>Mã sân</label>
            <input
              name="ma_san"
              value={form.ma_san}
              onChange={(e) => setForm({ ...form, ma_san: e.target.value })}
              required
            />
            <label>Tên sân</label>
            <input
              name="ten_san"
              value={form.ten_san}
              onChange={(e) => setForm({ ...form, ten_san: e.target.value })}
              required
            />
            <label>Sức chứa</label>
            <input
              type="number"
              name="suc_chua"
              value={form.suc_chua}
              onChange={(e) =>
                setForm({ ...form, suc_chua: Number(e.target.value) })
              }
            />
            <label>Ghi chú</label>
            <textarea
              name="ghi_chu"
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
            />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" type="submit">
                Lưu
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Courts;
