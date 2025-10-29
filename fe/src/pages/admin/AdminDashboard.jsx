import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminDashboard.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StatCard = ({ title, value, hint }) => (
  <div className="admin-card">
    <div className="admin-card__body">
      <div className="admin-card__title">{title}</div>
      <div className="admin-card__value">{value}</div>
      {hint && <div className="admin-card__hint">{hint}</div>}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    courts: 0,
    bookings: 0,
    timeframes: 0,
    customers: 0,
    totalRevenue: 0,
    cancelledBookings: 0,
  });

  // Revenue chart states
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 7 ngày trước
    endDate: new Date().toISOString().split('T')[0],
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [revenueData, setRevenueData] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  // Load revenue data based on report type
  const loadRevenueData = async () => {
    setChartLoading(true);
    try {
      // Fetch all paid bookings from the bookings endpoint
      const bookingsResponse = await api.get('/bookings', {
        params: { limit: 1000 }, // Get more data for dashboard calculations
      });

      if (bookingsResponse?.data?.success) {
        const responseData = bookingsResponse.data.data || [];
        // Handle new paginated format vs legacy format
        const allBookings = responseData.bookings || responseData || [];

        // Filter only paid bookings
        const paidBookings = allBookings.filter(
          (booking) => booking.is_paid === true
        );

        // Calculate revenue data based on report type
        let processedData = [];
        let totalRevenue = 0;
        let totalInvoices = 0; // Will be calculated correctly for the filtered period

        if (reportType === 'daily') {
          // Group by date within the date range
          const dailyRevenue = {};

          paidBookings.forEach((booking) => {
            const bookingDate = booking.ngay_su_dung
              ? booking.ngay_su_dung.split('T')[0]
              : null;
            if (
              bookingDate &&
              bookingDate >= dateRange.startDate &&
              bookingDate <= dateRange.endDate
            ) {
              const revenue = parseFloat(booking.tong_tien) || 0;
              if (!dailyRevenue[bookingDate]) {
                dailyRevenue[bookingDate] = 0;
              }
              dailyRevenue[bookingDate] += revenue;
              totalRevenue += revenue;
              totalInvoices++; // Count invoices only within the date range
            }
          });

          // Convert to array format for chart
          processedData = Object.entries(dailyRevenue).map(
            ([date, total_revenue]) => ({
              date: date + 'T00:00:00',
              total_revenue,
            })
          );
        } else if (reportType === 'monthly') {
          // Group by month for the selected year
          const monthlyRevenue = {};

          paidBookings.forEach((booking) => {
            const bookingDate = booking.ngay_su_dung
              ? new Date(booking.ngay_su_dung)
              : null;
            if (bookingDate && bookingDate.getFullYear() === year) {
              const month = bookingDate.getMonth() + 1; // 1-based month
              const revenue = parseFloat(booking.tong_tien) || 0;
              if (!monthlyRevenue[month]) {
                monthlyRevenue[month] = 0;
              }
              monthlyRevenue[month] += revenue;
              totalRevenue += revenue;
              totalInvoices++; // Count invoices only for the selected year
            }
          });

          // Convert to array format for chart
          processedData = Object.entries(monthlyRevenue).map(
            ([month, total_revenue]) => ({
              month: parseInt(month),
              total_revenue,
            })
          );
        }

        setRevenueData(processedData);

        // Calculate overall stats
        const averageRevenue =
          totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
        setOverallStats({
          total_revenue: totalRevenue,
          total_invoices: totalInvoices,
          average_revenue: averageRevenue,
        });
      }
    } catch (error) {
      console.error('Error loading revenue data:', error);
      // Set empty data on error
      setRevenueData([]);
      setOverallStats(null);
    } finally {
      setChartLoading(false);
    }
  };

  // Get chart data for display
  const getChartData = () => {
    if (!revenueData || revenueData.length === 0) return null;

    let labels, dataValues;

    switch (reportType) {
      case 'daily': {
        labels = [];
        dataValues = [];
        const dailyDataMap = {};

        // Map dữ liệu thực tế
        revenueData.forEach((item) => {
          // Ensure item.date exists and is a string before calling split
          if (item.date && typeof item.date === 'string') {
            const dateKey = item.date.split('T')[0];
            dailyDataMap[dateKey] = parseFloat(item.total_revenue) || 0;
          }
        });

        // Tạo tất cả ngày từ startDate đến endDate
        const startDate = new Date(dateRange.startDate + 'T00:00:00');
        const endDate = new Date(dateRange.endDate + 'T00:00:00');

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          const displayDate = `${currentDate
            .getDate()
            .toString()
            .padStart(2, '0')}/${(currentDate.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;

          labels.push(displayDate);
          dataValues.push(dailyDataMap[dateKey] || 0);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        break;
      }
      case 'monthly': {
        labels = [];
        dataValues = [];
        const monthlyDataMap = {};

        // Map dữ liệu thực tế
        revenueData.forEach((item) => {
          // Ensure item.month exists before using it
          if (item.month && typeof item.month === 'number') {
            monthlyDataMap[item.month] = parseFloat(item.total_revenue) || 0;
          }
        });

        // Tạo đầy đủ 12 tháng
        for (let month = 1; month <= 12; month++) {
          labels.push(`T${month}`);
          dataValues.push(monthlyDataMap[month] || 0);
        }
        break;
      }
      default:
        return null;
    }

    return {
      labels,
      datasets: [
        {
          label: 'Doanh thu (VNĐ)',
          data: dataValues,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        },
      ],
    };
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Doanh thu',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, bRes, tRes] = await Promise.all([
          api.get('/courts').catch(() => ({ data: { data: [] } })),
          api
            .get('/bookings', { params: { limit: 1000 } })
            .catch(() => ({ data: { data: [] } })),
          api.get('/timeframes').catch(() => ({ data: { data: [] } })),
        ]);

        // customers endpoint may not exist yet; try safe call
        let custRes = { data: { data: [] } };
        try {
          custRes = await api.get('/customers');
        } catch (err) {
          console.warn('Customers endpoint not available', err?.message || err);
        }

        // Calculate total revenue and cancelled bookings from all bookings
        const responseData = bRes.data.data || [];
        // Handle new paginated format vs legacy format
        const allBookings = responseData.bookings || responseData || [];
        const paidBookings = allBookings.filter(
          (booking) => booking.is_paid === true
        );
        const cancelledBookings = allBookings.filter(
          (booking) =>
            booking.trang_thai === 'canceled' ||
            booking.trang_thai === 'cancelled'
        );

        const totalRevenue = paidBookings.reduce((sum, booking) => {
          return sum + (parseFloat(booking.tong_tien) || 0);
        }, 0);

        setCounts({
          courts: (cRes.data.data || []).length,
          bookings: allBookings.length,
          timeframes: (tRes.data.data || []).length,
          customers: (custRes.data.data || []).length,
          totalRevenue: totalRevenue,
          cancelledBookings: cancelledBookings.length,
        });
      } catch (err) {
        console.error('Load dashboard data error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load revenue data when filters change
  useEffect(() => {
    loadRevenueData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, dateRange, year]);

  if (loading)
    return (
      <div className="admin-page">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="admin-page admin-dashboard-page">
      <div className="page-header">
        <h1>Báo cáo</h1>
        <p className="page-subtitle">
          Tổng quan hệ thống quản lý sân pickleball
        </p>
      </div>

      <div className="dashboard-grid">
        <StatCard title="Số sân" value={counts.courts} hint="Quản lý sân" />
        <StatCard title="Đơn đặt" value={counts.bookings} hint="Đặt sân" />
        <StatCard
          title="Khung giờ"
          value={counts.timeframes}
          hint="Khung giờ & ca"
        />
        <StatCard
          title="Khách hàng"
          value={counts.customers}
          hint="Danh bạ khách"
        />
        <StatCard
          title="Tổng doanh thu"
          value={formatCurrency(counts.totalRevenue)}
          hint="Đến hiện tại"
        />
        <StatCard
          title="Đơn bị hủy"
          value={counts.cancelledBookings}
          hint="Đơn đã hủy"
        />
      </div>

      {/* Revenue Overview Section */}
      <section className="admin-section revenue-section">
        <div className="section-header">
          <h2>Doanh thu</h2>
          <div className="revenue-filters">
            <div className="filter-group">
              <label>Loại báo cáo:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="daily">Theo ngày</option>
                <option value="monthly">Theo tháng</option>
              </select>
            </div>

            {reportType === 'daily' && (
              <>
                <div className="filter-group">
                  <label>Từ ngày:</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="filter-group">
                  <label>Đến ngày:</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({
                        ...dateRange,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {reportType === 'monthly' && (
              <div className="filter-group">
                <label>Năm:</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                />
              </div>
            )}
          </div>
        </div>

        {/* Overall Stats Cards */}
        {overallStats && (
          <div className="revenue-stats">
            <div className="stat-card revenue-card">
              <h4>Tổng doanh thu</h4>
              <p className="stat-value revenue">
                {formatCurrency(parseFloat(overallStats.total_revenue) || 0)}
              </p>
            </div>
            <div className="stat-card revenue-card">
              <h4>Số hóa đơn</h4>
              <p className="stat-value count">
                {overallStats.total_invoices || 0}
              </p>
            </div>
            <div className="stat-card revenue-card">
              <h4>Doanh thu TB</h4>
              <p className="stat-value average">
                {formatCurrency(parseFloat(overallStats.average_revenue) || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Revenue Chart */}
        <div className="chart-container">
          {chartLoading ? (
            <div className="chart-loading">Đang tải biểu đồ...</div>
          ) : getChartData() ? (
            reportType === 'daily' ? (
              <Line data={getChartData()} options={chartOptions} />
            ) : (
              <Bar data={getChartData()} options={chartOptions} />
            )
          ) : (
            <div className="no-chart-data">Không có dữ liệu để hiển thị</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
