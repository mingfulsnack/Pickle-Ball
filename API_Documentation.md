# Pickleball Court Booking API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Some endpoints require authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 📌 **PUBLIC ENDPOINTS** (No authentication required)

### 1. Get All Courts
**GET** `/public/courts`

**Description:** Lấy danh sách tất cả sân

**Query Parameters:**
- `activeOnly` (boolean, optional): Chỉ lấy sân đang hoạt động. Default: true

**Example Request:**
```bash
GET /api/public/courts?activeOnly=true
```

**Example Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách sân thành công",
  "data": [
    {
      "id": 1,
      "ma_san": "S001",
      "ten_san": "Sân 1",
      "trang_thai": true,
      "suc_chua": 4,
      "ghi_chu": "Sân gần lối vào"
    }
  ]
}
```

---

### 2. Check Court Availability
**GET** `/public/availability`

**Description:** Kiểm tra tình trạng sân trống theo ngày

**Query Parameters:**
- `date` (string, required): Ngày kiểm tra (YYYY-MM-DD)
- `start_time` (string, optional): Giờ bắt đầu (HH:00)
- `end_time` (string, optional): Giờ kết thúc (HH:00)

**Example Request:**
```bash
GET /api/public/availability?date=2024-10-07&start_time=09:00&end_time=11:00
```

**Example Response:**
```json
{
  "success": true,
  "message": "Kiểm tra tình trạng sân thành công",
  "data": [
    {
      "san_id": 1,
      "ma_san": "S001",
      "ten_san": "Sân 1",
      "suc_chua": 4,
      "is_available": true,
      "bookings": []
    },
    {
      "san_id": 2,
      "ma_san": "S002",
      "ten_san": "Sân 2",
      "suc_chua": 4,
      "is_available": false,
      "bookings": [
        {
          "start_time": "09:00:00",
          "end_time": "11:00:00",
          "trang_thai": "confirmed"
        }
      ]
    }
  ]
}
```

---

### 3. Get Available Time Slots for Specific Court
**GET** `/public/availability/courts/{san_id}`

**Description:** Lấy khung giờ trống của một sân cụ thể

**Path Parameters:**
- `san_id` (integer, required): ID của sân

**Query Parameters:**
- `date` (string, required): Ngày kiểm tra (YYYY-MM-DD)

**Example Request:**
```bash
GET /api/public/availability/courts/1?date=2024-10-07
```

**Example Response:**
```json
{
  "success": true,
  "message": "Lấy khung giờ trống thành công",
  "data": {
    "san_id": 1,
    "ma_san": "S001",
    "ten_san": "Sân 1",
    "date": "2024-10-07",
    "slots": [
      {
        "start_time": "06:00",
        "end_time": "07:00",
        "is_available": true
      },
      {
        "start_time": "07:00",
        "end_time": "08:00",
        "is_available": true
      },
      {
        "start_time": "09:00",
        "end_time": "10:00",
        "is_available": false
      }
    ],
    "booked_slots": [
      {
        "start_time": "09:00:00",
        "end_time": "11:00:00"
      }
    ]
  }
}
```

---

### 4. Calculate Booking Price
**POST** `/public/availability/calculate-price`

**Description:** Tính giá cho booking trước khi tạo

**Request Body:**
```json
{
  "ngay_su_dung": "2024-10-07",
  "slots": [
    {
      "san_id": 1,
      "start_time": "09:00",
      "end_time": "11:00"
    }
  ],
  "services": [
    {
      "dich_vu_id": 1,
      "so_luong": 2
    }
  ]
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Tính giá thành công",
  "data": {
    "ngay_su_dung": "2024-10-07",
    "total_hours": 2,
    "slots": [
      {
        "san_id": 1,
        "start_time": "09:00",
        "end_time": "11:00",
        "price": 240000
      }
    ],
    "services": [
      {
        "dich_vu_id": 1,
        "ten_dv": "Thuê vợt (1 cái)",
        "loai": "rent",
        "don_gia": 20000,
        "so_luong": 2,
        "total_hours": 2,
        "price": 80000
      }
    ],
    "summary": {
      "slots_total": 240000,
      "services_total": 80000,
      "grand_total": 320000
    }
  }
}
```

---

### 5. Get All Services
**GET** `/public/services`

**Description:** Lấy danh sách tất cả dịch vụ

**Query Parameters:**
- `loai` (string, optional): Loại dịch vụ ('rent' hoặc 'buy')

**Example Request:**
```bash
GET /api/public/services?loai=rent
```

**Example Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách dịch vụ thành công",
  "data": [
    {
      "id": 1,
      "ma_dv": "DV_RENT_RACKET",
      "ten_dv": "Thuê vợt (1 cái)",
      "loai": "rent",
      "don_gia": 20000.00,
      "ghi_chu": "Thuê theo giờ"
    },
    {
      "id": 2,
      "ma_dv": "DV_RENT_BALLS",
      "ten_dv": "Thuê bóng (1 túi 6 quả)",
      "loai": "rent",
      "don_gia": 15000.00,
      "ghi_chu": "Thuê theo giờ"
    }
  ]
}
```

---

### 6. Create Court Booking (PUBLIC)
**POST** `/public/bookings`

**Description:** Tạo đặt sân mới (khách hàng public)

**Request Body:**
```json
{
  "user_id": null,
  "customer": {
    "full_name": "Nguyễn Văn A",
    "phone": "0987654321",
    "email": "nguyenvana@email.com"
  },
  "ngay_su_dung": "2024-10-07",
  "slots": [
    {
      "san_id": 1,
      "start_time": "09:00",
      "end_time": "11:00",
      "ghi_chu": "Đặt sân cho nhóm bạn"
    }
  ],
  "services": [
    {
      "dich_vu_id": 1,
      "so_luong": 2
    },
    {
      "dich_vu_id": 3,
      "so_luong": 4
    }
  ],
  "payment_method": "cash",
  "note": "Ghi chú đặt sân"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Đặt sân thành công",
  "data": {
    "booking": {
      "id": 1,
      "ma_pd": "PD24100712345",
      "user_id": null,
      "created_by": null,
      "ngay_su_dung": "2024-10-07",
      "trang_thai": "pending",
      "payment_method": "cash",
      "is_paid": false,
      "note": "Ghi chú đặt sân",
      "ngay_tao": "2024-10-06T10:30:00.000Z"
    },
    "slots": [
      {
        "san_id": 1,
        "start_time": "09:00",
        "end_time": "11:00",
        "slotTotal": 240000
      }
    ],
    "services": [
      {
        "dv": {
          "id": 1,
          "ten_dv": "Thuê vợt (1 cái)",
          "loai": "rent",
          "don_gia": 20000
        },
        "qty": 2,
        "lineTotal": 80000
      }
    ],
    "total": 320000
  }
}
```

---

### 7. Get Booking by Token
**GET** `/public/bookings/{token}`

**Description:** Lấy thông tin đặt sân bằng mã đặt sân

**Path Parameters:**
- `token` (string, required): Mã đặt sân (ma_pd)

**Example Request:**
```bash
GET /api/public/bookings/PD24100712345
```

**Example Response:**
```json
{
  "success": true,
  "message": "Lấy thông tin đặt sân thành công",
  "data": {
    "booking": {
      "id": 1,
      "ma_pd": "PD24100712345",
      "ngay_su_dung": "2024-10-07",
      "trang_thai": "pending",
      "payment_method": "cash",
      "is_paid": false
    },
    "slots": [
      {
        "san_id": 1,
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "don_gia": 240000
      }
    ],
    "services": [
      {
        "dich_vu_id": 1,
        "so_luong": 2,
        "don_gia": 20000
      }
    ]
  }
}
```

---

### 8. Cancel Booking
**PUT** `/public/bookings/{token}/cancel`

**Description:** Hủy đặt sân bằng mã đặt sân

**Path Parameters:**
- `token` (string, required): Mã đặt sân (ma_pd)

**Request Body:**
```json
{
  "reason": "Thay đổi kế hoạch"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Hủy đặt sân thành công",
  "data": null
}
```

---

## 🔐 **ADMIN ENDPOINTS** (Authentication required)

### 9. Get All Bookings (Admin)
**GET** `/bookings`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (integer, optional): Trang. Default: 1
- `limit` (integer, optional): Số lượng per page. Default: 20

**Example Request:**
```bash
GET /api/bookings?page=1&limit=20
```

---

### 10. Get Booking Detail (Admin)
**GET** `/bookings/{id}`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Path Parameters:**
- `id` (string, required): ID hoặc mã đặt sân

---

### 11. Confirm Booking (Admin)
**PUT** `/bookings/{id}/confirm`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Path Parameters:**
- `id` (string, required): ID hoặc mã đặt sân

---

### 12. Manage Courts (Admin)
**POST** `/courts` - Tạo sân mới
**PUT** `/courts/{id}` - Cập nhật sân
**DELETE** `/courts/{id}` - Xóa sân

**Headers:**
```
Authorization: Bearer <manager_token>
```

---

### 13. Manage Services (Admin)
**POST** `/services` - Tạo dịch vụ mới
**PUT** `/services/{id}` - Cập nhật dịch vụ
**DELETE** `/services/{id}` - Xóa dịch vụ

---

## 📱 **Testing with Postman**

### Environment Variables
Create these variables in Postman:
```
base_url = http://localhost:3000/api
admin_token = <your_admin_jwt_token>
```

### Collection Structure
1. **Public API** (No auth needed)
   - Get Courts
   - Check Availability
   - Calculate Price
   - Create Booking
   - Get Booking by Token
   - Cancel Booking

2. **Admin API** (Auth required)
   - Login
   - Manage Bookings
   - Manage Courts
   - Manage Services

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (court not available)
- `500` - Server Error

### Notes
- Thời gian phải theo format HH:00 (chỉ giờ chẵn)
- Ngày theo format YYYY-MM-DD
- Dịch vụ 'rent' sẽ tính theo tổng số giờ đặt sân
- Dịch vụ 'buy' tính theo số lượng