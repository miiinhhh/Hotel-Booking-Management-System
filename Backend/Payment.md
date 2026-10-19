# Module Payment – Tài liệu Đặc tả Kỹ thuật & Hướng dẫn Kiểm thử API

> **Project:** Hotel-Booking-Management-System  
> **Công nghệ:** ASP.NET Core Web API (.NET 10), Clean Architecture, Dapper ORM, SQL Server.  
> **Base URL:** `http://localhost:5131`  
> **Swagger UI:** `http://localhost:5131/swagger`

---

## MỤC LỤC
1. [Tổng quan Module Payment & Danh sách Endpoint](#1-tổng-quan-module-payment--danh-sách-endpoint)
2. [Cơ chế Xác thực (JWT) & Phân quyền (Roles)](#2-cơ-chế-xác-thực-jwt--phân-quyền-roles)
3. [Đặc tả chi tiết các API Endpoints](#3-đặc-tả-chi-tiết-các-api-endpoints)
   - [3.1. Tạo giao dịch thanh toán (`POST /api/payments`)](#31-tạo-giao-dịch-thanh-toán-post-apipayments)
   - [3.2. Lấy chi tiết giao dịch (`GET /api/payments/{id}`)](#32-lấy-chi-tiết-giao-dịch-get-apipaymentsid)
   - [3.3. Xác nhận thanh toán (`PUT /api/payments/{id}/confirm`)](#33-xác-nhận-thanh-toán-put-apipaymentsidconfirm)
   - [3.4. Khách hàng xem lịch sử của chính mình (`GET /api/payments/my-history`)](#34-khách-hàng-xem-lịch-sử-của-chính-mình-get-apipaymentsmy-history)
   - [3.5. Xem lịch sử thanh toán của một Booking (`GET /api/bookings/{bookingId}/payments`)](#35-xem-lịch-sử-thanh-toán-của-một-booking-get-apibookingsbookingidpayments)
   - [3.6. Admin / Staff tra cứu lịch sử thanh toán (`GET /api/payments`)](#36-admin--staff-tra-cứu-lịch-sử-thanh-toán-get-apipayments)
4. [Đặc tả Cơ sở dữ liệu & Ràng buộc (Database Schema)](#4-đặc-tả-cơ-sở-dữ-liệu--ràng-buộc-database-schema)
5. [Quy trình Thanh toán mẫu (End-to-End Workflow)](#5-quy-trình-thanh-toán-mẫu-end-to-end-workflow)
6. [Kịch bản Kiểm thử Lỗi Nghiệp vụ & Bảo mật (Test Cases)](#6-kịch-bản-kiểm-thử-lỗi-nghiệp-vụ--bảo-mật-test-cases)
7. [Hạn chế Hệ thống Cần Lưu ý](#7-hạn-chế-hệ-thống-cần-lưu-ý)

---

## 1. TỔNG QUAN MODULE PAYMENT & DANH SÁCH ENDPOINT

Module Payment quản lý toàn bộ các giao dịch tài chính (thanh toán cọc, thanh toán tiền mặt tại quầy, hoàn tiền) gắn liền với đơn đặt phòng (`Bookings`).

### Bảng tổng hợp Endpoints trong `PaymentsController`

| STT | Phương thức | URL Endpoint | Quyền hạn (Authorization) | Mục đích |
| :---: | :---: | :--- | :--- | :--- |
| 1 | `POST` | `/api/payments` | `[Authorize]` (Customer, Staff, Admin) | Tạo giao dịch thanh toán mới (`Pending`) |
| 2 | `GET` | `/api/payments/{id}` | `[Authorize]` (Tất cả người dùng) | Xem chi tiết 1 giao dịch theo `PaymentId` |
| 3 | `PUT` | `/api/payments/{id}/confirm` | `[Authorize(Roles = "Admin,Hotel Staff")]` | Xác nhận giao dịch thành công / thất bại |
| 4 | `GET` | `/api/payments/my-history` | `[Authorize]` (Tất cả người dùng) | Khách hàng xem lịch sử thanh toán của mình (Phân trang) |
| 5 | `GET` | `/api/bookings/{bookingId}/payments`<br>*(Alias: `/api/payments/booking/{bookingId}`)* | `[Authorize]` (Chủ Booking, Staff phụ trách, Admin) | Xem lịch sử thanh toán của 1 đơn đặt phòng (Phân trang, chống IDOR) |
| 6 | `GET` | `/api/payments` | `[Authorize(Roles = "Admin,Hotel Staff")]` | Admin/Staff tra cứu thanh toán có phân trang & bộ lọc |

---

## 2. CƠ CHẾ XÁC THỰC (JWT) & PHÂN QUYỀN (ROLES)

Tất cả các API trong module Payment đều được bảo vệ bởi middleware xác thực JWT của ASP.NET Core.

### 2.1. Cấu trúc Header bắt buộc
Mỗi request gửi đến API cần đính kèm HTTP Header:
```http
Authorization: Bearer <ACCESS_TOKEN>
```

### 2.2. Ma trận phân quyền (Access Control Matrix)

| Vai trò (Role) | `POST /payments` | `GET /payments/{id}` | `PUT /confirm` | `GET /my-history` | `GET /bookings/{id}/payments` | `GET /payments` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Chưa đăng nhập** | ❌ `401` | ❌ `401` | ❌ `401` | ❌ `401` | ❌ `401` | ❌ `401` |
| **Customer** | ✅ | ✅ | ❌ `403` | ✅ *(chỉ xem của mình)* | ✅ *(chỉ xem booking của mình)* | ❌ `403` |
| **Hotel Staff** | ✅ | ✅ | ✅ | ✅ | ✅ *(chỉ xem booking thuộc khu vực phụ trách)* | ✅ *(chỉ xem giao dịch khu vực phụ trách)* |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ *(toàn hệ thống)* | ✅ *(toàn hệ thống)* |

---

## 3. ĐẶC TẢ CHI TIẾT CÁC API ENDPOINTS

### 3.1. Tạo giao dịch thanh toán (`POST /api/payments`)

Khách hàng hoặc nhân viên khởi tạo một giao dịch thanh toán cho một đơn đặt phòng. Giao dịch được tạo mặc định ở trạng thái `Pending`.

- **Method:** `POST`
- **URL:** `http://localhost:5131/api/payments`
- **Header:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`

#### Request Body
```json
{
  "bookingId": 1,
  "paymentMethod": "Deposit",
  "paymentType": "Payment",
  "amount": 300000,
  "transactionCode": "VNPAY_20261012_001"
}
```
*Các giá trị hợp lệ theo Database CHECK Constraints:*
- `paymentMethod`: `"Deposit"` (Đặt cọc) hoặc `"Cash"` (Tiền mặt).
- `paymentType`: `"Payment"` (Thanh toán) hoặc `"Refund"` (Hoàn tiền).
- `amount`: Số tiền thanh toán (bắt buộc $> 0$ và $\le$ `RemainingAmount` của Booking).
- `transactionCode`: Mã giao dịch tham chiếu từ cổng thanh toán (tùy chọn, là trường `UNIQUE`).

#### cURL mẫu
```bash
curl -X POST "http://localhost:5131/api/payments" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": 1,
    "paymentMethod": "Deposit",
    "paymentType": "Payment",
    "amount": 300000,
    "transactionCode": "VNPAY_20261012_001"
  }'
```

#### Response thành công — `201 Created`
```json
{
  "paymentId": 1,
  "bookingId": 1,
  "paymentMethod": "Deposit",
  "paymentType": "Payment",
  "amount": 300000.00,
  "status": "Pending",
  "transactionCode": "VNPAY_20261012_001",
  "paidAt": null,
  "createdAt": "2026-10-12T08:45:00Z"
}
```

---

### 3.2. Lấy chi tiết giao dịch (`GET /api/payments/{id}`)

Tra cứu thông tin chi tiết của một giao dịch theo mã thanh toán.

- **Method:** `GET`
- **URL:** `http://localhost:5131/api/payments/{id}`
- **Header:** `Authorization: Bearer <TOKEN>`

#### cURL mẫu
```bash
curl -X GET "http://localhost:5131/api/payments/1" \
  -H "Authorization: Bearer <TOKEN>"
```

#### Response thành công — `200 OK`
```json
{
  "paymentId": 1,
  "bookingId": 1,
  "paymentMethod": "Deposit",
  "paymentType": "Payment",
  "amount": 300000.00,
  "status": "Pending",
  "transactionCode": "VNPAY_20261012_001",
  "paidAt": null,
  "createdAt": "2026-10-12T08:45:00Z"
}
```
*Trường hợp không tìm thấy:* Trả về `404 Not Found` (`{"message": "Payment not found."}`).

---

### 3.3. Xác nhận thanh toán (`PUT /api/payments/{id}/confirm`)

Được gọi bởi lễ tân/admin hoặc webhook từ cổng thanh toán để cập nhật kết quả giao dịch. Chỉ các giao dịch đang ở trạng thái `Pending` mới được phép xác nhận.

- **Method:** `PUT`
- **URL:** `http://localhost:5131/api/payments/{id}/confirm`
- **Quyền hạn:** `Admin`, `Hotel Staff`
- **Header:** `Authorization: Bearer <STAFF_OR_ADMIN_TOKEN>`, `Content-Type: application/json`

#### Trường hợp A: Xác nhận thanh toán THÀNH CÔNG (`isSuccessful: true`)
```bash
curl -X PUT "http://localhost:5131/api/payments/1/confirm" \
  -H "Authorization: Bearer <STAFF_OR_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "isSuccessful": true
  }'
```

**Response — `200 OK`:**
```json
{
  "paymentId": 1,
  "bookingId": 1,
  "paymentMethod": "Deposit",
  "paymentType": "Payment",
  "amount": 300000.00,
  "status": "Paid",
  "transactionCode": "VNPAY_20261012_001",
  "paidAt": "2026-10-12T08:50:00Z",
  "createdAt": "2026-10-12T08:45:00Z"
}
```
*Tác động cơ sở dữ liệu:*
- Cột `Status` của Payment cập nhật thành `Paid`.
- Cột `PaidAt` được gán bằng thời gian UTC hiện tại.
- Trong bảng `Bookings`, hệ thống tự động tính lại tổng tiền đã trả, trừ `RemainingAmount`.
- `PaymentStatus` của Booking tự động chuyển thành:
  - `"PartiallyPaid"` nếu số tiền đã trả $< TotalAmount$.
  - `"Paid"` nếu đã trả đủ $100\%$.

#### Trường hợp B: Xác nhận thanh toán THẤT BẠI (`isSuccessful: false`)
```bash
curl -X PUT "http://localhost:5131/api/payments/1/confirm" \
  -H "Authorization: Bearer <STAFF_OR_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "isSuccessful": false
  }'
```

**Response — `200 OK`:**
```json
{
  "paymentId": 1,
  "bookingId": 1,
  "paymentMethod": "Deposit",
  "paymentType": "Payment",
  "amount": 300000.00,
  "status": "Failed",
  "transactionCode": "VNPAY_20261012_001",
  "paidAt": null,
  "createdAt": "2026-10-12T08:45:00Z"
}
```
*Tác động:* Bảng `Bookings` không bị trừ nợ, `RemainingAmount` giữ nguyên.

---

### 3.4. Khách hàng xem lịch sử của chính mình (`GET /api/payments/my-history`)

Khách hàng xem danh sách các lần nộp tiền/hoàn tiền của tất cả các booking do chính mình đặt. User ID được trích xuất hoàn toàn tự động từ JWT Token ở phía server.

- **Method:** `GET`
- **URL:** `http://localhost:5131/api/payments/my-history?page=1&pageSize=10`
- **Header:** `Authorization: Bearer <CUSTOMER_TOKEN>`

#### Tham số Query
| Tham số | Kiểu dữ liệu | Mặc định | Ràng buộc | Ý nghĩa |
| :--- | :---: | :---: | :---: | :--- |
| `page` | `int` | `1` | $\ge 1$ | Số thứ tự trang hiện tại |
| `pageSize` | `int` | `10` | $1 \le pageSize \le 100$ | Số bản ghi hiển thị trên mỗi trang |

#### cURL mẫu
```bash
curl -X GET "http://localhost:5131/api/payments/my-history?page=1&pageSize=10" \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>"
```

#### Response thành công — `200 OK`
```json
{
  "items": [
    {
      "paymentId": 1,
      "bookingId": 1,
      "bookingCode": "BK2026101201",
      "customerId": 5,
      "customerName": "Nguyen Van A",
      "customerEmail": "nguyenvana@gmail.com",
      "amount": 300000.00,
      "paymentMethod": "Deposit",
      "paymentType": "Payment",
      "status": "Paid",
      "transactionCode": "VNPAY_20261012_001",
      "createdAt": "2026-10-12T08:45:00Z",
      "paidAt": "2026-10-12T08:50:00Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1
}
```

---

### 3.5. Xem lịch sử thanh toán của một Booking (`GET /api/bookings/{bookingId}/payments`)

Tra cứu lịch sử các lần thanh toán của một đơn đặt phòng cụ thể. Có hỗ trợ alias `GET /api/payments/booking/{bookingId}`.

- **Method:** `GET`
- **URL:** `http://localhost:5131/api/bookings/{bookingId}/payments?page=1&pageSize=10`  
  *(hoặc `http://localhost:5131/api/payments/booking/{bookingId}?page=1&pageSize=10`)*
- **Header:** `Authorization: Bearer <TOKEN>`

#### Cơ chế bảo mật chống IDOR (Insecure Direct Object Reference)
1. Server kiểm tra `bookingId` có tồn tại không. Nếu không có $\rightarrow$ `404 Not Found`.
2. Nếu người gọi là `Admin` $\rightarrow$ Cho phép truy cập.
3. Nếu người gọi là `Hotel Staff` $\rightarrow$ Kiểm tra nhân viên có được phân công khu vực phụ trách phòng trong đơn đặt phòng này không (`StaffAreaAssignments`). Nếu không $\rightarrow$ `403 Forbidden`.
4. Nếu người gọi là `Customer` $\rightarrow$ Kiểm tra `booking.CustomerId == currentUserId`. Nếu không khớp $\rightarrow$ `403 Forbidden`.

#### cURL mẫu
```bash
curl -X GET "http://localhost:5131/api/bookings/1/payments?page=1&pageSize=10" \
  -H "Authorization: Bearer <TOKEN>"
```

#### Response thành công — `200 OK`
```json
{
  "items": [
    {
      "paymentId": 1,
      "bookingId": 1,
      "bookingCode": "BK2026101201",
      "customerId": 5,
      "customerName": "Nguyen Van A",
      "customerEmail": "nguyenvana@gmail.com",
      "amount": 300000.00,
      "paymentMethod": "Deposit",
      "paymentType": "Payment",
      "status": "Paid",
      "transactionCode": "VNPAY_20261012_001",
      "createdAt": "2026-10-12T08:45:00Z",
      "paidAt": "2026-10-12T08:50:00Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1
}
```

---

### 3.6. Admin / Staff tra cứu lịch sử thanh toán (`GET /api/payments`)

Endpoint dành riêng cho quản trị viên và nhân viên lễ tân tra cứu danh sách thanh toán trên toàn hệ thống hoặc theo khu vực được phân công, có phân trang và bộ lọc nâng cao.

- **Method:** `GET`
- **URL:** `http://localhost:5131/api/payments`
- **Quyền hạn:** `Admin`, `Hotel Staff` (`[Authorize(Roles = "Admin,Hotel Staff")]`)
- **Header:** `Authorization: Bearer <STAFF_OR_ADMIN_TOKEN>`

#### Tham số Query lọc (Optional)
| Tham số | Kiểu dữ liệu | Mặc định | Ý nghĩa |
| :--- | :---: | :---: | :--- |
| `page` | `int` | `1` | Trang cần xem |
| `pageSize` | `int` | `10` | Số bản ghi mỗi trang (tối đa 100) |
| `bookingId` | `long?` | `null` | Lọc theo mã đơn đặt phòng |
| `status` | `string?` | `null` | Lọc theo trạng thái: `Pending`, `Paid`, `Failed`, `Refunded` |
| `fromDate` | `DateTime?` | `null` | Lọc các giao dịch tạo từ thời điểm này (`p.CreatedAt >= fromDate`) |
| `toDate` | `DateTime?` | `null` | Lọc các giao dịch tạo trước thời điểm này (`p.CreatedAt <= toDate`) |

#### cURL mẫu (Admin lọc các giao dịch đã thanh toán)
```bash
curl -X GET "http://localhost:5131/api/payments?page=1&pageSize=10&status=Paid&bookingId=1" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### Response thành công — `200 OK`
```json
{
  "items": [
    {
      "paymentId": 1,
      "bookingId": 1,
      "bookingCode": "BK2026101201",
      "customerId": 5,
      "customerName": "Nguyen Van A",
      "customerEmail": "nguyenvana@gmail.com",
      "amount": 300000.00,
      "paymentMethod": "Deposit",
      "paymentType": "Payment",
      "status": "Paid",
      "transactionCode": "VNPAY_20261012_001",
      "createdAt": "2026-10-12T08:45:00Z",
      "paidAt": "2026-10-12T08:50:00Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1
}
```

---

## 4. ĐẶC TẢ CƠ SỞ DỮ LIỆU & RÀNG BUỘC (DATABASE SCHEMA)

Dữ liệu thanh toán được lưu trữ tại bảng `Payments` trong SQL Server (`Hotel_Booking_Database_Updated.sql`).

### Cấu trúc bảng `Payments`

```sql
CREATE TABLE Payments
(
    PaymentId       BIGINT IDENTITY(1,1) NOT NULL,
    BookingId       BIGINT NOT NULL,
    PaymentMethod   VARCHAR(20) NOT NULL,
    PaymentType     VARCHAR(20) NOT NULL,
    Amount          DECIMAL(18,2) NOT NULL,
    Status          VARCHAR(20) NOT NULL,
    TransactionCode VARCHAR(150) NULL,
    PaidAt          DATETIME2 NULL,
    CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Payments PRIMARY KEY (PaymentId),
    CONSTRAINT FK_Payments_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(BookingId),
    CONSTRAINT CK_Payments_Method CHECK (PaymentMethod IN ('Deposit', 'Cash')),
    CONSTRAINT CK_Payments_Type CHECK (PaymentType IN ('Payment', 'Refund')),
    CONSTRAINT CK_Payments_Status CHECK (Status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
    CONSTRAINT UQ_Payments_TransactionCode UNIQUE (TransactionCode)
);
```

### Các ràng buộc quan trọng
1. **Kiểu dữ liệu ID:** `PaymentId` và `BookingId` đều là `BIGINT` trong SQL, tương ứng với kiểu `long` trong C#.
2. **Khóa ngoại & Quan hệ:** `FK_Payments_Booking` liên kết với bảng `Bookings`. Bảng `Payments` không có khóa ngoại trực tiếp tới `Users`; muốn lấy thông tin khách hàng, câu lệnh SQL bắt buộc phải JOIN:
   `Payments p -> Bookings b -> Users u`.
3. **CHECK Constraints:**
   - `PaymentMethod`: Chỉ chấp nhận hai giá trị `'Deposit'` hoặc `'Cash'`.
   - `PaymentType`: Chỉ chấp nhận hai giá trị `'Payment'` hoặc `'Refund'`.
   - `Status`: Chỉ chấp nhận `'Pending'`, `'Paid'`, `'Failed'`, `'Refunded'`.
4. **Thời gian giao dịch:** Bảng `Payments` **không có cột `UpdatedAt`**. Thời gian thanh toán thành công được lưu tại cột `PaidAt` (`DATETIME2 NULL`). Khi giao dịch mới tạo (`Pending`), `PaidAt` mang giá trị `NULL`.

---

## 5. QUY TRÌNH THANH TOÁN MẪU (END-TO-END WORKFLOW)

Quy trình chuẩn khi khách hàng đặt phòng và hoàn tất thanh toán:

```
[1. Khách tạo Booking] 
       │ 
       ▼ (TotalAmount = 1.000.000, RemainingAmount = 1.000.000, PaymentStatus = "Unpaid")
[2. Khách nộp cọc 300k] ──► POST /api/payments (Amount = 300.000, Status = "Pending")
       │ 
       ▼
[3. Cổng TT Callback / Lễ tân xác nhận] ──► PUT /api/payments/{id}/confirm (isSuccessful = true)
       │ 
       ▼ (Status = "Paid", PaidAt = Now())
       ▼ (Booking tự cập nhật: RemainingAmount = 700.000, PaymentStatus = "PartiallyPaid")
[4. Khách kiểm tra lịch sử] ──► GET /api/payments/my-history
       │ 
       ▼
[5. Ngày Check-in, Khách nộp nốt 700k tiền mặt tại quầy] ──► POST /api/payments (Method = "Cash", Amount = 700.000)
       │ 
       ▼
[6. Lễ tân xác nhận tiền mặt] ──► PUT /api/payments/{id2}/confirm (isSuccessful = true)
       │ 
       ▼ (Booking tự cập nhật: RemainingAmount = 0, PaymentStatus = "Paid")
```

---

## 6. KỊCH BẢN KIỂM THỬ LỖI NGHIỆP VỤ & BẢO MẬT (TEST CASES)

| Mã Case | Hành vi / Dữ liệu gửi lên | Endpoint | Kết quả HTTP mong đợi | Diễn giải nguyên nhân |
| :---: | :--- | :--- | :---: | :--- |
| **VAL-01** | `"amount": 0` hoặc `"amount": -50000` | `POST /api/payments` | `400 Bad Request` | `"Payment amount must be greater than 0."` |
| **VAL-02** | `"bookingId": 99999` (không tồn tại) | `POST /api/payments` | `404 Not Found` | `"Booking not found."` |
| **VAL-03** | `"paymentMethod": "BankTransfer"` | `POST /api/payments` | `400 Bad Request` | `"Payment method is invalid."` (Chỉ chấp nhận `Deposit`, `Cash`) |
| **VAL-04** | Số tiền vượt nợ (Còn 500k nhưng gửi 700k) | `POST /api/payments` | `400 Bad Request` | `"Payment amount cannot exceed remaining amount..."` |
| **VAL-05** | Booking đã thanh toán đủ (`RemainingAmount = 0`) | `POST /api/payments` | `400 Bad Request` | `"This booking has already been fully paid."` |
| **VAL-06** | Xác nhận giao dịch đã xong (`Status != Pending`) | `PUT /api/payments/{id}/confirm` | `400 Bad Request` | `"Only pending payments can be confirmed."` |
| **VAL-07** | Tham số phân trang `page = 0` hoặc `pageSize = 200` | `GET /my-history` | `400 Bad Request` | `"Page must be at least 1."` hoặc `"PageSize must be between 1 and 100."` |
| **SEC-01** | Không gửi Header `Authorization` | Mọi API thanh toán | `401 Unauthorized` | Chặn truy cập người dùng ẩn danh |
| **SEC-02** | Khách hàng A cố xem Booking của khách hàng B | `GET /bookings/{idB}/payments` | `403 Forbidden` | Chống IDOR: Khách chỉ được xem booking chính chủ |
| **SEC-03** | Khách hàng thường gọi API tra cứu của Admin | `GET /api/payments` | `403 Forbidden` | Quyền truy cập chỉ dành cho `Admin,Hotel Staff` |
| **SEC-04** | Nhân viên xem booking ngoài khu vực phân công | `GET /bookings/{id}/payments` | `403 Forbidden` | Nhân viên bị giới hạn phạm vi bởi `StaffAreaAssignments` |

---

## 7. HẠN CHẾ HỆ THỐNG CẦN LƯU Ý

1. **Phân quyền Nhân viên theo Khu vực (`StaffAreaAssignments`):**  
   Bảng `StaffAreaAssignments` đã tồn tại trong database schema và đã được cài đặt vào câu lệnh truy vấn Dapper (`EXISTS ...`). Tuy nhiên, trong toàn bộ mã nguồn Backend C# hiện **chưa có API để Admin gán nhân viên vào từng khu vực**. Nếu tài khoản Staff chưa được chèn bản ghi phân công trong DB, Staff đó sẽ không thấy giao dịch nào.
2. **Cơ chế Thu hồi Token (Token Revocation):**  
   Hệ thống đang sử dụng cơ chế JWT Stateless tiêu chuẩn. Hiện tại chưa có bảng lưu Blacklist Token, do đó token sau khi đăng nhập vẫn có hiệu lực cho đến khi hết hạn thời gian sống (`exp`).