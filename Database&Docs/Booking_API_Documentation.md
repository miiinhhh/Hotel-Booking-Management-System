git# TÀI LIỆU HƯỚNG DẪN SỬ DỤNG API - QUẢN LÝ ĐẶT PHÒNG

Tài liệu này mô tả chi tiết các API thuộc chức năng Quản lý Đặt phòng (Booking).


Mỗi API sẽ bao gồm mô tả chức năng, dữ liệu đầu vào (Request) và cấu trúc dữ liệu trả về (Response).


---


## 1. TẠO MỚI ĐƠN ĐẶT PHÒNG

**Endpoint:** POST /api/Booking

**Mô tả:** Khách hàng sử dụng API này để đặt phòng khách sạn. Hệ thống sẽ tự động tính toán tổng tiền, tiền cọc, và sinh mã đơn hàng.

**Dữ liệu gửi lên (Request Body):**

```json
{
  "checkInDate": "2026-10-10",
  "checkOutDate": "2026-10-15",
  "numberOfGuests": 2,
  "paymentMethod": "Deposit",
  "voucherCode": "",
  "specialRequests": "Phòng tầng cao, view biển",
  "rooms": [
    {
      "roomId": 101,
      "unitPrice": 500000
    }
  ],
  "guests": [
    {
      "fullName": "Nguyen Van A",
      "phone": "0987654321",
      "email": "nguyenvana@example.com",
      "isPrimaryGuest": true
    }
  ]
}
```

**Dữ liệu trả về (Response - 201 Created):**

```json
{
  "success": true,
  "message": "Đặt phòng thành công. Vui lòng thanh toán cọc trong 15 phút để giữ phòng.",
  "data": {
    "bookingId": 1,
    "bookingCode": "BK20261006123456",
    "customerId": 1,
    "checkInDate": "2026-10-10",
    "checkOutDate": "2026-10-15",
    "numberOfGuests": 2,
    "bookingStatus": "Pending",
    "paymentMethod": "Deposit",
    "paymentStatus": "Unpaid",
    "subTotal": 2500000.00,
    "taxAmount": 250000.00,
    "totalAmount": 2750000.00,
    "depositAmount": 825000.00,
    "remainingAmount": 1925000.00
  }
}
```


---


## 2. XEM CHI TIẾT ĐƠN ĐẶT PHÒNG (THEO ID)

**Endpoint:** GET /api/Booking/{id}

**Mô tả:** Dùng để xem toàn bộ thông tin chi tiết của 1 đơn đặt phòng, bao gồm danh sách phòng, danh sách khách, và lịch sử trạng thái.

**Dữ liệu gửi lên:**
- Tham số trên URL: `id` (Kiểu số nguyên - Ví dụ: 1)

**Dữ liệu trả về (Response - 200 OK):**

```json
{
  "success": true,
  "message": "",
  "data": {
    "bookingId": 1,
    "bookingCode": "BK20261006123456",
    "bookingStatus": "Pending",
    "details": [
      {
        "bookingDetailId": 1,
        "roomId": 101,
        "unitPrice": 500000.00,
        "numberOfNights": 5,
        "subTotal": 2500000.00
      }
    ],
    "guests": [
      {
        "bookingGuestId": 1,
        "fullName": "Nguyen Van A",
        "isPrimaryGuest": true
      }
    ],
    "statusHistories": [
      {
        "oldStatus": null,
        "newStatus": "Pending",
        "changedAt": "2026-10-06T12:00:00Z",
        "note": "Đơn đặt phòng mới được tạo"
      }
    ]
  }
}
```


---


## 3. TRA CỨU ĐƠN ĐẶT PHÒNG (THEO MÃ CODE)

**Endpoint:** GET /api/Booking/code/{bookingCode}

**Mô tả:** Lễ tân có thể dùng chức năng này để tìm kiếm nhanh 1 đơn đặt phòng thông qua mã code (Ví dụ tìm kiếm trên thanh search).

**Dữ liệu gửi lên:**
- Tham số trên URL: `bookingCode` (Kiểu chuỗi - Ví dụ: BK20261006123456)

**Dữ liệu trả về:**
Cấu trúc trả về y hệt như API số 2 (Xem chi tiết theo ID).


---


## 4. LẤY DANH SÁCH VÀ TÌM KIẾM ĐƠN ĐẶT PHÒNG

**Endpoint:** GET /api/Booking

**Mô tả:** API dùng cho màn hình danh sách, hỗ trợ lọc theo trạng thái, khách hàng, thời gian và có phân trang.

**Dữ liệu gửi lên (Query Parameters - Tất cả đều không bắt buộc):**
- `CustomerId`: ID của khách hàng
- `Status`: Lọc theo trạng thái (Pending, Confirmed, Cancelled...)
- `PaymentStatus`: Lọc theo trạng thái thanh toán (Unpaid, Paid)
- `FromDate`: Tìm từ ngày (YYYY-MM-DD)
- `ToDate`: Tìm đến ngày (YYYY-MM-DD)
- `PageIndex`: Trang số mấy (Mặc định: 1)
- `PageSize`: Số bản ghi 1 trang (Mặc định: 10)

**Dữ liệu trả về (Response - 200 OK):**

```json
{
  "success": true,
  "message": "",
  "data": [
    {
      "bookingId": 1,
      "bookingCode": "BK20261006123456",
      "checkInDate": "2026-10-10",
      "checkOutDate": "2026-10-15",
      "bookingStatus": "Pending",
      "totalAmount": 2750000.00,
      "roomCount": 1
    }
  ]
}
```


---


## 5. HỦY ĐƠN ĐẶT PHÒNG

**Endpoint:** POST /api/Booking/{id}/cancel

**Mô tả:** Dùng để khách hàng tự hủy đơn, hoặc Admin/Lễ tân hủy đơn khi quá hạn thanh toán.

**Dữ liệu gửi lên (Request Body):**

```json
{
  "reason": "Tôi có việc bận đột xuất nên không thể đi được."
}
```

**Dữ liệu trả về (Response - 200 OK):**

```json
{
  "success": true,
  "message": "Hủy đơn đặt phòng thành công.",
  "data": true
}
```


---


## 6. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (DÀNH CHO STAFF)

**Endpoint:** PATCH /api/Booking/{id}/status

**Mô tả:** Dùng cho Lễ tân hoặc Admin cập nhật tiến độ của đơn hàng (VD: Xác nhận cọc, Check-in, Check-out). Khi cập nhật, hệ thống sẽ lưu lại lịch sử thay đổi.

**Dữ liệu gửi lên (Request Body):**

```json
{
  "newStatus": "Confirmed",
  "note": "Khách đã thanh toán đủ 30% tiền cọc.",
  "specialRequests": "Khách vẫn muốn giữ yêu cầu phòng tầng cao."
}
```
*Lưu ý:* Các giá trị hợp lệ cho `newStatus`: Pending, Confirmed, CheckedIn, CheckedOut, Completed, Cancelled, Expired.

**Dữ liệu trả về (Response - 200 OK):**

```json
{
  "success": true,
  "message": "Cập nhật trạng thái đơn đặt phòng thành công.",
  "data": true
}
```
