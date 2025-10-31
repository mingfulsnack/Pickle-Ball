import { useState, useEffect } from 'react';
import api from '../services/api';
import showToast from '../utils/toast';
import Modal from '../components/Modal';
import './TimeFrames.scss';

const TimeFrames = () => {
  const [timeFrames, setTimeFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTimeFrameModal, setShowTimeFrameModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);

  const [timeFrameFormData, setTimeFrameFormData] = useState({
    ten_khung_gio: '',
    start_at: '',
    end_at: '',
    ngay_ap_dung: 1,
  });

  const [shiftFormData, setShiftFormData] = useState({
    ten_ca: '',
    start_at: '',
    end_at: '',
    gia_tien: '',
  });

  const [pendingShifts, setPendingShifts] = useState([]);

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

  const handleTimeFrameSubmit = async (e) => {
    e.preventDefault();

    if (pendingShifts.length === 0) {
      showToast.error('Bắt buộc phải có ít nhất 1 ca làm việc trong khung giờ');
      return;
    }

    try {
      // Normalize time format for timeframe (HH:MM:SS -> HH:MM)
      const normalizeTime = (timeStr) => {
        if (!timeStr) return timeStr;
        return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
      };

      const normalizedTimeFrameData = {
        ...timeFrameFormData,
        start_at: normalizeTime(timeFrameFormData.start_at),
        end_at: normalizeTime(timeFrameFormData.end_at),
      };

      if (selectedTimeFrame) {
        // Update existing time frame
        await api.put(
          `/timeframes/${selectedTimeFrame.id}`,
          normalizedTimeFrameData
        );

        // Delete existing shifts
        const existingShifts = selectedTimeFrame.shifts || [];
        for (const shift of existingShifts) {
          await api.delete(`/shifts/${shift.id}`);
        }

        // Add new shifts (normalize times to avoid server validation errors)
        for (const shift of pendingShifts) {
          const normalizeTime = (timeStr) => {
            if (!timeStr) return timeStr;
            return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
          };

          await api.post('/shifts', {
            ...shift,
            start_at: normalizeTime(shift.start_at),
            end_at: normalizeTime(shift.end_at),
            khung_gio_id: selectedTimeFrame.id,
          });
        }

        showToast.success('Cập nhật khung giờ và ca thành công');
      } else {
        // Create new time frame
        const timeFrameResponse = await api.post(
          '/timeframes',
          normalizedTimeFrameData
        );
        const newTimeFrameId = timeFrameResponse.data.data.id;

        // Add shifts to new time frame (normalize times to avoid server validation errors)
        for (const shift of pendingShifts) {
          const normalizeTime = (timeStr) => {
            if (!timeStr) return timeStr;
            return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
          };

          await api.post('/shifts', {
            ...shift,
            start_at: normalizeTime(shift.start_at),
            end_at: normalizeTime(shift.end_at),
            khung_gio_id: newTimeFrameId,
          });
        }

        showToast.success('Tạo khung giờ và ca thành công');
      }

      setShowTimeFrameModal(false);
      resetTimeFrameForm();
      fetchTimeFrames();
    } catch (error) {
      console.error('Error saving time frame:', error);
      console.error('Request payload (timeframe):', timeFrameFormData);
      console.error('Request payload (pending shifts):', pendingShifts);
      console.error('Server response:', error.response?.data);
      console.error('Validation details:', error.response?.data?.details);
      console.error('Server status:', error.response?.status);

      const serverData = error.response?.data;
      let errorMessage = 'Lỗi khi lưu khung giờ';

      if (serverData?.message) {
        errorMessage = serverData.message;
      } else if (serverData?.details && Array.isArray(serverData.details)) {
        errorMessage = serverData.details.join(', ');
      } else if (serverData?.error) {
        errorMessage = serverData.error;
      }

      showToast.error(
        `${errorMessage} (Status: ${error.response?.status || 'Unknown'})`
      );
    }
  };

  const handleCreateTimeFrame = () => {
    setSelectedTimeFrame(null);
    setPendingShifts([]);
    setTimeFrameFormData({
      ten_khung_gio: '',
      start_at: '',
      end_at: '',
      ngay_ap_dung: 1,
    });
    setShiftFormData({
      ten_ca: '',
      start_at: '',
      end_at: '',
      gia_tien: '',
    });
    setShowTimeFrameModal(true);
  };

  const handleEditTimeFrame = (timeFrame) => {
    setSelectedTimeFrame(timeFrame);
    setTimeFrameFormData({
      ten_khung_gio: timeFrame.ten_khung_gio,
      start_at: timeFrame.start_at,
      end_at: timeFrame.end_at,
      ngay_ap_dung: timeFrame.ngay_ap_dung,
    });
    // Don't pre-populate existing shifts - user must add new shifts
    setPendingShifts([]);
    setShiftFormData({
      ten_ca: '',
      start_at: timeFrame.start_at,
      end_at: timeFrame.end_at,
      gia_tien: '',
    });
    setShowTimeFrameModal(true);
  };

  const handleDeleteTimeFrame = async (id) => {
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn xóa khung giờ này? Tất cả ca trong khung giờ cũng sẽ bị xóa.'
      )
    ) {
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

  const handleCreateShift = (timeFrame) => {
    setSelectedTimeFrame(timeFrame);
    setSelectedShift(null);
    setShiftFormData({
      ten_ca: '',
      start_at: timeFrame.start_at,
      end_at: timeFrame.end_at,
      gia_tien: '',
    });
    setShowShiftModal(true);
  };

  const handleEditShift = (timeFrame, shift) => {
    setSelectedTimeFrame(timeFrame);
    setSelectedShift(shift);
    setShiftFormData({
      ten_ca: shift.ten_ca,
      start_at: shift.start_at,
      end_at: shift.end_at,
      gia_tien:
        shift.gia_tien !== undefined ? shift.gia_tien : shift.gia_theo_gio,
    });
    setShowShiftModal(true);
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();

    // Validate shift time is within time frame
    if (
      shiftFormData.start_at < selectedTimeFrame.start_at ||
      shiftFormData.end_at > selectedTimeFrame.end_at
    ) {
      showToast.error('Ca phải nằm trong khung giờ hoạt động');
      return;
    }

    let payload;
    try {
      // Normalize time strings to HH:MM (server expects /^([01]\d|2[0-3]):([0-5]\d)$/)
      const normalizeTime = (t) => {
        if (!t) return t;
        // If time contains seconds (HH:MM:SS), strip to HH:MM
        if (t.length >= 5 && t.indexOf(':') >= 0) return t.slice(0, 5);
        return t;
      };

      // Build payload but omit empty or undefined fields so partial updates work
      const raw = {
        khung_gio_id: Number(selectedTimeFrame.id),
        ten_ca: shiftFormData.ten_ca,
        start_at: normalizeTime(shiftFormData.start_at),
        end_at: normalizeTime(shiftFormData.end_at),
        gia_tien:
          shiftFormData.gia_tien === '' || shiftFormData.gia_tien === null
            ? undefined
            : Number(shiftFormData.gia_tien),
      };

      payload = {};
      Object.entries(raw).forEach(([k, v]) => {
        if (v !== undefined && v !== '') payload[k] = v;
      });

      console.debug('Shift payload prepared:', payload);

      if (selectedShift) {
        // For update ensure we send at least one field
        if (Object.keys(payload).length === 0) {
          showToast.error('Không có trường nào để cập nhật');
          return;
        }
        await api.put(`/shifts/${selectedShift.id}`, payload);
        showToast.success('Cập nhật ca thành công');
      } else {
        // For create require all fields
        if (
          !payload.ten_ca ||
          !payload.start_at ||
          !payload.end_at ||
          payload.gia_tien === undefined
        ) {
          showToast.error('Vui lòng điền đầy đủ thông tin ca trước khi tạo');
          return;
        }
        await api.post('/shifts', payload);
        showToast.success('Tạo ca thành công');
      }

      setShowShiftModal(false);
      resetShiftForm();
      fetchTimeFrames();
    } catch (error) {
      console.error('Error saving shift:', error);
      console.error('Request payload sent:', error.config?.data || payload);
      console.error('Server response data:', error.response?.data);
      const serverData = error.response?.data;
      let msg = 'Lỗi khi lưu ca';
      if (serverData?.message) msg = serverData.message;
      else if (serverData?.details && Array.isArray(serverData.details))
        msg = serverData.details.join(', ');
      else if (error.message) msg = error.message;
      showToast.error(
        `${msg} (Status: ${error.response?.status || 'Unknown'})`
      );
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ca này?')) {
      return;
    }

    try {
      await api.delete(`/shifts/${shiftId}`);
      showToast.success('Xóa ca thành công');
      fetchTimeFrames();
    } catch (error) {
      console.error('Error deleting shift:', error);
      showToast.error(error.response?.data?.message || 'Lỗi khi xóa ca');
    }
  };

  const addPendingShift = () => {
    if (
      !shiftFormData.ten_ca ||
      !shiftFormData.start_at ||
      !shiftFormData.end_at ||
      shiftFormData.gia_tien === '' ||
      shiftFormData.gia_tien === null
    ) {
      showToast.error('Vui lòng điền đầy đủ thông tin ca');
      return;
    }

    if (
      shiftFormData.start_at < timeFrameFormData.start_at ||
      shiftFormData.end_at > timeFrameFormData.end_at
    ) {
      showToast.error('Ca phải nằm trong khung giờ hoạt động');
      return;
    }

    // Normalize time strings to HH:MM and parse price as integer to avoid precision issues
    const normalizeTime = (timeStr) => {
      if (!timeStr) return timeStr;
      // Strip seconds if present (HH:MM:SS -> HH:MM)
      return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
    };

    const normalized = {
      ...shiftFormData,
      start_at: normalizeTime(shiftFormData.start_at),
      end_at: normalizeTime(shiftFormData.end_at),
      gia_tien: parseInt(shiftFormData.gia_tien, 10) || 0, // Use parseInt to avoid floating point issues
    };
    setPendingShifts([...pendingShifts, normalized]);
    setShiftFormData({
      ten_ca: '',
      start_at: timeFrameFormData.start_at,
      end_at: timeFrameFormData.end_at,
      gia_tien: '',
    });
  };

  const removePendingShift = (index) => {
    setPendingShifts(pendingShifts.filter((_, i) => i !== index));
  };

  const resetTimeFrameForm = () => {
    setTimeFrameFormData({
      ten_khung_gio: '',
      start_at: '',
      end_at: '',
      ngay_ap_dung: 1,
    });
    setPendingShifts([]);
    setSelectedTimeFrame(null);
    setShiftFormData({
      ten_ca: '',
      start_at: '',
      end_at: '',
      gia_tien: '',
    });
  };

  const resetShiftForm = () => {
    setShiftFormData({
      ten_ca: '',
      start_at: '',
      end_at: '',
      gia_tien: '',
    });
    setSelectedShift(null);
    setSelectedTimeFrame(null);
  };

  const handleCloseTimeFrameModal = () => {
    setShowTimeFrameModal(false);
    resetTimeFrameForm();
  };

  const handleCloseShiftModal = () => {
    setShowShiftModal(false);
    resetShiftForm();
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Quản lý khung giờ</h1>
        <p className="page-subtitle">
          Thiết lập khung giờ và ca làm việc cho các sân
        </p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={handleCreateTimeFrame}>
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
                  onClick={() => handleEditTimeFrame(timeFrame)}
                >
                  Sửa
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteTimeFrame(timeFrame.id)}
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

              <div className="shifts">
                <div className="shifts-header">
                  <h4>Ca làm việc ({timeFrame.shifts?.length || 0}):</h4>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleCreateShift(timeFrame)}
                  >
                    Thêm ca
                  </button>
                </div>

                {timeFrame.shifts && timeFrame.shifts.length > 0 ? (
                  timeFrame.shifts.map((shift) => (
                    <div key={shift.id} className="shift-item">
                      <div className="shift-info">
                        <span className="shift-name">{shift.ten_ca}</span>
                        <span className="shift-time">
                          {shift.start_at} - {shift.end_at}
                        </span>
                        <span className="shift-price">
                          {Number(
                            shift.gia_tien !== undefined
                              ? shift.gia_tien
                              : shift.gia_theo_gio || 0
                          ).toLocaleString('vi-VN')}
                          đ/h
                        </span>
                      </div>
                      <div className="shift-actions">
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => handleEditShift(timeFrame, shift)}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-xs btn-danger"
                          onClick={() => handleDeleteShift(shift.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-shifts">
                    Chưa có ca nào. Hãy thêm ca đầu tiên!
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {timeFrames.length === 0 && (
        <div className="empty-state">
          <p>Chưa có khung giờ nào. Hãy tạo khung giờ đầu tiên!</p>
        </div>
      )}

      {/* Modal for TimeFrame Create/Edit */}
      <Modal
        isOpen={showTimeFrameModal}
        onClose={handleCloseTimeFrameModal}
        title={selectedTimeFrame ? 'Sửa khung giờ' : 'Thêm khung giờ mới'}
      >
        <form onSubmit={handleTimeFrameSubmit} className="time-frame-form">
          <div className="form-group">
            <label>Tên khung giờ:</label>
            <input
              type="text"
              value={timeFrameFormData.ten_khung_gio}
              onChange={(e) =>
                setTimeFrameFormData({
                  ...timeFrameFormData,
                  ten_khung_gio: e.target.value,
                })
              }
              required
              placeholder="VD: Khung giờ thứ 2"
            />
          </div>

          <div className="form-group">
            <label>Ngày áp dụng:</label>
            <select
              value={timeFrameFormData.ngay_ap_dung}
              onChange={(e) =>
                setTimeFrameFormData({
                  ...timeFrameFormData,
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
                value={timeFrameFormData.start_at}
                onChange={(e) => {
                  setTimeFrameFormData({
                    ...timeFrameFormData,
                    start_at: e.target.value,
                  });
                  // Update shift form start time to match
                  setShiftFormData({
                    ...shiftFormData,
                    start_at: e.target.value,
                  });
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Giờ kết thúc:</label>
              <input
                type="time"
                value={timeFrameFormData.end_at}
                onChange={(e) => {
                  setTimeFrameFormData({
                    ...timeFrameFormData,
                    end_at: e.target.value,
                  });
                  // Update shift form end time to match
                  setShiftFormData({
                    ...shiftFormData,
                    end_at: e.target.value,
                  });
                }}
                required
              />
            </div>
          </div>

          {/* Shift management within timeframe modal */}
          <div className="shifts-section">
            <h4>Ca làm việc (bắt buộc):</h4>

            <div className="add-shift-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Tên ca:</label>
                  <input
                    type="text"
                    value={shiftFormData.ten_ca}
                    onChange={(e) =>
                      setShiftFormData({
                        ...shiftFormData,
                        ten_ca: e.target.value,
                      })
                    }
                    placeholder="VD: Ca sáng"
                  />
                </div>
                <div className="form-group">
                  <label>Giá/giờ:</label>
                  <input
                    type="number"
                    value={shiftFormData.gia_tien}
                    onChange={(e) =>
                      setShiftFormData({
                        ...shiftFormData,
                        gia_tien: e.target.value,
                      })
                    }
                    placeholder="VD: 120000"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Giờ bắt đầu ca:</label>
                  <input
                    type="time"
                    value={shiftFormData.start_at}
                    onChange={(e) =>
                      setShiftFormData({
                        ...shiftFormData,
                        start_at: e.target.value,
                      })
                    }
                    min={timeFrameFormData.start_at}
                    max={timeFrameFormData.end_at}
                  />
                </div>
                <div className="form-group">
                  <label>Giờ kết thúc ca:</label>
                  <input
                    type="time"
                    value={shiftFormData.end_at}
                    onChange={(e) =>
                      setShiftFormData({
                        ...shiftFormData,
                        end_at: e.target.value,
                      })
                    }
                    min={timeFrameFormData.start_at}
                    max={timeFrameFormData.end_at}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addPendingShift}
                className="btn btn-sm btn-secondary"
              >
                Thêm ca
              </button>
            </div>

            <div className="pending-shifts">
              {pendingShifts.map((shift, index) => (
                <div key={index} className="pending-shift-item">
                  <span>{shift.ten_ca}</span>
                  <span>
                    {shift.start_at} - {shift.end_at}
                  </span>
                  <span>
                    {Number(
                      shift.gia_tien !== undefined
                        ? shift.gia_tien
                        : shift.gia_theo_gio || 0
                    ).toLocaleString('vi-VN')}
                    đ/h
                  </span>
                  <button
                    type="button"
                    onClick={() => removePendingShift(index)}
                    className="btn btn-xs btn-danger"
                  >
                    Xóa
                  </button>
                </div>
              ))}

              {pendingShifts.length === 0 && (
                <p className="no-shifts-warning">
                  ⚠️ Bắt buộc phải có ít nhất 1 ca làm việc trong khung giờ
                </p>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCloseTimeFrameModal}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pendingShifts.length === 0}
            >
              {selectedTimeFrame ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal for Shift Create/Edit (for existing timeframes) */}
      <Modal
        isOpen={showShiftModal}
        onClose={handleCloseShiftModal}
        title={selectedShift ? 'Sửa ca làm việc' : 'Thêm ca mới'}
      >
        <form onSubmit={handleShiftSubmit} className="shift-form">
          <div className="form-group">
            <label>Tên ca:</label>
            <input
              type="text"
              value={shiftFormData.ten_ca}
              onChange={(e) =>
                setShiftFormData({ ...shiftFormData, ten_ca: e.target.value })
              }
              required
              placeholder="VD: Ca sáng"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Giờ bắt đầu:</label>
              <input
                type="time"
                value={shiftFormData.start_at}
                onChange={(e) =>
                  setShiftFormData({
                    ...shiftFormData,
                    start_at: e.target.value,
                  })
                }
                required
                min={selectedTimeFrame?.start_at}
                max={selectedTimeFrame?.end_at}
              />
            </div>

            <div className="form-group">
              <label>Giờ kết thúc:</label>
              <input
                type="time"
                value={shiftFormData.end_at}
                onChange={(e) =>
                  setShiftFormData({ ...shiftFormData, end_at: e.target.value })
                }
                required
                min={selectedTimeFrame?.start_at}
                max={selectedTimeFrame?.end_at}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Giá theo giờ (VNĐ):</label>
            <input
              type="number"
              value={shiftFormData.gia_tien}
              onChange={(e) =>
                setShiftFormData({
                  ...shiftFormData,
                  gia_tien: e.target.value,
                })
              }
              required
              placeholder="VD: 120000"
              min="0"
            />
          </div>

          {selectedTimeFrame && (
            <div className="timeframe-info">
              <p>
                <strong>Khung giờ:</strong> {selectedTimeFrame.ten_khung_gio}
              </p>
              <p>
                <strong>Thời gian khung giờ:</strong>{' '}
                {selectedTimeFrame.start_at} - {selectedTimeFrame.end_at}
              </p>
              <p className="note">⚠️ Ca phải nằm trong thời gian khung giờ</p>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCloseShiftModal}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedShift ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TimeFrames;
