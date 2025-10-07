# 🏓 Pickleball Bồ Đề - Court Booking System

Hệ thống đặt sân pickleball hiện đại với giao diện thân thiện và API mạnh mẽ.

## 🌟 Tính năng chính

### 🌍 Public Website (Customer)
- **Trang chủ hiện đại**: Design tối giản, màu xanh lá chủ đạo
- **Đặt sân online**: Tìm kiếm và đặt sân theo thời gian
- **Tính giá tự động**: Hiển thị giá trước khi đặt
- **Quản lý booking**: Xem và hủy đặt sân bằng mã
- **Dịch vụ thêm**: Thuê vợt, bóng và các tiện ích khác

### 🔐 Admin Panel
- **Quản lý đặt sân**: Xem, xác nhận, hủy booking
- **Quản lý sân**: CRUD operations cho sân
- **Quản lý dịch vụ**: Thêm/sửa/xóa dịch vụ
- **Báo cáo**: Dashboard thống kê doanh thu

## 🚀 Cách chạy hệ thống

### 1. Backend (API Server)

```powershell
# Di chuyển vào thư mục backend
cd "c:\Users\pc\Pickle Ball\be"

# Cài đặt dependencies
npm install

# Tạo file .env (nếu chưa có)
# DATABASE_URL=postgresql://username:password@localhost:5432/pickleball_db
# JWT_SECRET=your_secret_key_here
# PORT=3000

# Chạy server
npm start
```

Backend sẽ chạy tại: **http://localhost:3000**

### 2. Frontend (Website)

```powershell
# Di chuyển vào thư mục frontend  
cd "c:\Users\pc\Pickle Ball\fe"

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

## 🎨 Giao diện Website

### Trang chủ (Homepage)
- **Header**: Logo Apple + "Pickleball Bồ Đề", menu điều hướng
- **Hero Section**: Banner quảng cáo với nút "Đặt ngay"
- **Tính năng nổi bật**: 3 cards giới thiệu ưu điểm
- **Thanh tìm kiếm**: Chọn ngày, giờ và tìm sân trống
- **Dịch vụ khách hàng**: 3 sections với mô tả chi tiết
- **Footer**: Thông tin liên hệ và địa chỉ

### Trang đặt sân (BookingPage)
- **Form tìm kiếm**: Ngày, giờ bắt đầu, giờ kết thúc
- **Hiển thị sân**: Grid các sân với trạng thái khả dụng
- **Chọn dịch vụ**: Checkbox các dịch vụ thêm
- **Thông tin khách hàng**: Form nhập thông tin
- **Tính giá**: Hiển thị tổng tiền tự động
- **Đặt sân**: Button xác nhận đặt sân

## 🔧 Testing API

### Sử dụng PowerShell Script
```powershell
# Chạy script test tự động
.\test_api.ps1
```

### Sử dụng Postman
1. Import file `Postman_Collection.json`
2. Set environment variables:
   - `base_url`: http://localhost:3000/api
   - `admin_token`: JWT token (sau khi login)
3. Chạy các request theo thứ tự

### API Endpoints chính

#### 🌍 Public API (Không cần đăng nhập)
```
GET    /public/courts              - Danh sách sân
GET    /public/availability        - Kiểm tra khả dụng  
GET    /public/services            - Danh sách dịch vụ
POST   /public/availability/calculate-price  - Tính giá
POST   /public/bookings            - Tạo đặt sân
GET    /public/bookings/{token}    - Xem đặt sân
PUT    /public/bookings/{token}/cancel  - Hủy đặt sân
```

#### 🔐 Admin API (Cần JWT token)
```
POST   /auth/login                 - Đăng nhập admin
GET    /bookings                   - Danh sách đặt sân
PUT    /bookings/{id}/confirm      - Xác nhận đặt sân
POST   /courts                     - Tạo sân mới
POST   /services                   - Tạo dịch vụ mới
```

## 📱 Responsive Design

Website được thiết kế responsive cho mọi thiết bị:
- **Desktop**: Full layout với grid system
- **Tablet**: Adaptive columns và spacing
- **Mobile**: Single column, touch-friendly

## 🎯 Công nghệ sử dụng

### Backend
- **Node.js + Express**: REST API server
- **PostgreSQL**: Database chính
- **JWT**: Authentication
- **Joi**: Validation
- **CORS**: Cross-origin requests

### Frontend  
- **React 19**: UI framework
- **React Router**: Routing
- **Sass/SCSS**: Styling
- **Axios**: HTTP client
- **Vite**: Build tool

## 📋 Database Schema

### Bảng chính
- `san` - Thông tin sân pickleball
- `bang_gia_san` - Bảng giá theo ngày/giờ
- `dich_vu` - Dịch vụ thêm (thuê vợt, bóng...)
- `phieu_dat_san` - Đơn đặt sân
- `chi_tiet_phieu_san` - Chi tiết khung giờ đặt
- `chi_tiet_phieu_dich_vu` - Dịch vụ đi kèm
- `users` - Tài khoản (customer, staff, manager)

## 🐛 Troubleshooting

### Backend không chạy được
```powershell
# Kiểm tra Node.js version
node --version  # Cần >= 16.x

# Kiểm tra PostgreSQL
# Đảm bảo database đã được tạo và có connection string đúng
```

### Frontend không hiển thị
```powershell
# Clear cache và reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

### API không hoạt động
```powershell
# Test health check
curl http://localhost:3000/health

# Kiểm tra CORS settings trong server.js
```

## 📞 Hỗ trợ

- **Documentation**: Xem file `API_Documentation.md`
- **Postman Collection**: Import `Postman_Collection.json`
- **Test Scripts**: Chạy `test_api.ps1`

---

🎉 **Chúc bạn sử dụng hệ thống thành công!** 🏓