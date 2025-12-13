import { useEffect, useState } from 'react';
import { publicApi } from '../services/api';
import './CourtStatus.scss';
import LoadingSpinner from '../components/LoadingSpinner';

const CourtStatus = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState(null);
  const [slotsByCourt, setSlotsByCourt] = useState({});
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadCourts = async () => {
      try {
        const res = await publicApi.get('/public/courts');
        const data = res.data?.data || [];
        setCourts(data);
        if (data.length > 0) setSelectedCourtId(String(data[0].id));
      } catch (err) {
        console.error('Error loading courts', err);
      }
    };
    loadCourts();
  }, []);

  useEffect(() => {
    if (!date || courts.length === 0) return;

    const fetchSlots = async () => {
      setLoading(true);
      try {
        const targets = showAll
          ? courts
          : courts.filter((c) => String(c.id) === String(selectedCourtId));
        const promises = targets.map((c) =>
          publicApi
            .get(`/public/availability/courts/${c.id}`, { params: { date } })
            .then((r) => ({ id: c.id, data: r.data?.data }))
        );

        const results = await Promise.all(promises);
        const map = {};
        results.forEach((r) => {
          map[r.id] = r.data;
        });
        setSlotsByCourt(map);
      } catch (err) {
        console.error('Error fetching slots for courts', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, courts, selectedCourtId, showAll]);

  const isToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    return date === today;
  };

  const renderCourtPanel = (court) => {
    const info = slotsByCourt[court.id];
    const slots = info?.slots || [];

    // Chỉ filter các giờ đã qua nếu là ngày hôm nay
    const filteredSlots = isToday()
      ? slots.filter((s) => {
          const now = new Date();
          const currentHour = now.getHours();
          const slotHour = parseInt(s.start_time.split(':')[0], 10);
          return slotHour >= currentHour;
        })
      : slots; // Các ngày khác hiển thị tất cả slots từ API

    return (
      <div key={court.id} className="court-panel">
        <div className="court-header">
          <h4>{court.ten_san || court.ma_san || `Sân ${court.id}`}</h4>
          <div className="court-meta">Sức chứa: {court.suc_chua || '-'}</div>
        </div>

        <div className="slots-grid">
          {filteredSlots.map((s) => (
              <div
                key={`${court.id}_${s.start_time}`}
                className={`slot ${s.is_available ? 'available' : 'booked'}`}
                title={`${s.start_time} - ${s.end_time} ${
                  s.is_available ? 'Chưa đặt' : 'Đã đặt'
                }`}
              >
                <span className="time-range">
                  {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-page court-status-page">
      <div className="page-header">
        <h1>Theo dõi tình trạng đặt sân</h1>
        <p className="page-subtitle">
          Xem trạng thái (chưa đặt / đã đặt) cho các sân theo ngày và khung giờ
        </p>
      </div>

      <div className="controls">
        <div className="left">
          <label>Chọn ngày:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="right">
          <label>Chọn sân:</label>
          <select
            value={selectedCourtId || ''}
            onChange={(e) => setSelectedCourtId(e.target.value)}
          >
            {courts.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.ten_san || c.ma_san || `Sân ${c.id}`}
              </option>
            ))}
          </select>
          <label className="show-all">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />{' '}
            Hiển thị tất cả sân
          </label>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="courts-container">
          {showAll
            ? courts.map((c) => renderCourtPanel(c))
            : courts
                .filter((c) => String(c.id) === String(selectedCourtId))
                .map((c) => renderCourtPanel(c))}
        </div>
      )}

      <div className="legend">
        <span className="legend-item">
          <span className="box available" /> Chưa đặt
        </span>
        <span className="legend-item">
          <span className="box booked" /> Đã đặt
        </span>
      </div>
    </div>
  );
};

export default CourtStatus;
