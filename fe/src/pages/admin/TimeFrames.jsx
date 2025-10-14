import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import showToast from '../../utils/toast';
import Modal from '../../components/Modal';
import './TimeFrames.scss';

const TimeFrames = () => {
  const [timeFrames, setTimeFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(null);
  const [formData, setFormData] = useState({
    ten_khung_gio: '',
    start_at: '',
    end_at: '',
    ngay_ap_dung: 1, // Default to Monday
  });

  const dayNames = {
    0: 'Chủ nhật',
    1: 'Thứ hai',
    2: 'Thứ ba',
    3: 'Thứ tư',
    4: 'Thứ năm',
    5: 'Thứ sáu',
    6: 'Thứ bảy',
  };

  useEffect(() => {
    fetchTimeFrames();
  }, []);

  const fetchTimeFrames = async () => {
    try {
      const response = await api.get('/timeframes');
      setTimeFrames(response.data.data || []);
    } catch (error) {
      console.error('Error fetching time frames:', error);
      showToast.error('Lỗi khi tải danh sách khung giờ');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTimeFrame) {
        // Update existing
        await api.put(`/timeframes/${selectedTimeFrame.id}`, formData);
        showToast.success('Cập nhật khung giờ thành công');
      } else {
        // Create new
        await api.post('/timeframes', formData);
        showToast.success('Tạo khung giờ thành công');
      }
      setShowModal(false);
      resetForm();
      fetchTimeFrames();
    } catch (error) {
      console.error('Error saving time frame:', error);
      showToast.error(error.response?.data?.message || 'Lỗi khi lưu khung giờ');
    }
  };

  const handleEdit = (timeFrame) => {
    setSelectedTimeFrame(timeFrame);
    setFormData({
      ten_khung_gio: timeFrame.ten_khung_gio,
      start_at: timeFrame.start_at,
      end_at: timeFrame.end_at,
      ngay_ap_dung: timeFrame.ngay_ap_dung,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khung giờ này?')) {
      return;
    }

    try {
      await api.delete(`/timeframes/${id}`);
      showToast.success('Xóa khung giờ thành công');
      fetchTimeFrames();
    } catch (error) {
      console.error('Error deleting time frame:', error);
      showToast.error(error.response?.data?.message || 'Lỗi khi xóa khung giờ');
    }
  };

  const resetForm = () => {
    setFormData({
      ten_khung_gio: '',
      start_at: '',
      end_at: '',
      ngay_ap_dung: 1,
    });
    setSelectedTimeFrame(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="time-frames">
      <div className="time-frames__header">
        <h1>Quản lý khung giờ</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Thêm khung giờ
        </button>
      </div>

      <div className="time-frames__grid">
        {timeFrames.map((timeFrame) => (
          <div key={timeFrame.id} className="time-frame-card">
            <div className="time-frame-card__header">
              <h3>{timeFrame.ten_khung_gio}</h3>
              <div className="actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleEdit(timeFrame)}
                >
                  Sửa
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(timeFrame.id)}
                >
                  Xóa
                </button>
              </div>
            </div>

            <div className="time-frame-card__content">
              <p>
                <strong>Ngày:</strong> {dayNames[timeFrame.ngay_ap_dung]}
              </p>
              <p>
                <strong>Thời gian:</strong> {timeFrame.start_at} -{' '}
                {timeFrame.end_at}
              </p>

              {timeFrame.shifts && timeFrame.shifts.length > 0 && (
                <div className="shifts">
                  <h4>Ca làm việc ({timeFrame.shifts.length}):</h4>
                  {timeFrame.shifts.map((shift) => (
                    <div key={shift.id} className="shift-item">
                      <span>{shift.ten_ca}</span>
                      <span>
                        {shift.start_at} - {shift.end_at}
                      </span>
                      <span>
                        {Number(shift.gia_theo_gio).toLocaleString('vi-VN')}đ/h
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {timeFrames.length === 0 && (
        <div className="empty-state">
          <p>Chưa có khung giờ nào. Hãy tạo khung giờ đầu tiên!</p>
        </div>
      )}

      {/* Modal for Create/Edit */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedTimeFrame ? 'Sửa khung giờ' : 'Thêm khung giờ mới'}
      >
        <form onSubmit={handleSubmit} className="time-frame-form">
          <div className="form-group">
            <label>Tên khung giờ:</label>
            <input
              type="text"
              value={formData.ten_khung_gio}
              onChange={(e) =>
                setFormData({ ...formData, ten_khung_gio: e.target.value })
              }
              required
              placeholder="VD: Khung giờ thứ 2"
            />
          </div>

          <div className="form-group">
            <label>Ngày áp dụng:</label>
            <select
              value={formData.ngay_ap_dung}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ngay_ap_dung: Number(e.target.value),
                })
              }
              required
            >
              {Object.entries(dayNames).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Giờ bắt đầu:</label>
              <input
                type="time"
                value={formData.start_at}
                onChange={(e) =>
                  setFormData({ ...formData, start_at: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Giờ kết thúc:</label>
              <input
                type="time"
                value={formData.end_at}
                onChange={(e) =>
                  setFormData({ ...formData, end_at: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedTimeFrame ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TimeFrames;
