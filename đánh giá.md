# Đánh giá tiến độ đồ án Hotel Booking Management System

Ngày đánh giá: 14/10/2026

## 1. Phạm vi đánh giá

Đánh giá dựa trên:

- `Database&Docs/Hotel_Booking.md`
- `Database&Docs/Hotel_Booking_Database_Updated.sql`
- `Backend/ROOMS.md`
- `Backend/Payment.md`
- Source code hiện tại trong bốn layer:
  - `HotelBooking.API`
  - `HotelBooking.Application`
  - `HotelBooking.Domain`
  - `HotelBooking.Infrastructure`

## 2. Tổng quan tiến độ

| Nhóm chức năng | Trạng thái |
|---|---|
| Clean Architecture | Đã có khung cơ bản |
| Authentication cơ bản | Đã làm một phần khá tốt |
| Quản lý profile tài khoản | Đã làm cơ bản |
| Hotel CRUD | Đã làm cơ bản |
| Room/Room Type CRUD | Đã làm một phần |
| Room search cơ bản | Đã làm |
| Booking | Đã làm khung cơ bản, còn thiếu nghiệp vụ và bảo mật |
| Payment | Đã làm một phần |
| Staff phân quyền theo khu vực | Chưa hoàn thành |
| Admin quản lý Staff | Chưa làm |
| Tìm kiếm khách sạn theo ngày và số khách | Chưa làm đầy đủ |
| Giá theo mùa và phụ thu | Chưa làm |
| Voucher | Chưa làm |
| Chính sách hủy/hoàn tiền | Chưa làm |
| Review/Rating | Chưa làm |
| Notification/SignalR | Chưa làm |
| Media hình ảnh/video | Chưa làm |
| Dashboard báo cáo | Chưa làm |
| Frontend hoàn chỉnh | Chưa đánh giá là hoàn thành |
| Deployment/CI/CD/Backup | Chưa làm |

Backend hiện đã hoàn thành phần nền tảng và một số CRUD cơ bản, nhưng các quy trình nghiệp vụ chính của hệ thống khách sạn vẫn chưa hoàn thiện. Ước lượng phạm vi chức năng đã hoàn thành khoảng **30–40%**.

## 3. Các phần đã hoàn thành

### 3.1. Kiến trúc backend

Backend hiện được tổ chức thành bốn layer:

```text
Backend/
├── HotelBooking.API
├── HotelBooking.Application
├── HotelBooking.Domain
└── HotelBooking.Infrastructure
```

Vai trò hiện tại:

- `Domain`: Entity, enum và constant.
- `Application`: DTO, service và interface.
- `Infrastructure`: EF Core, repository, DbContext, JWT và password hashing.
- `API`: Controller, middleware và cấu hình dependency injection.

Kiến trúc phù hợp với hướng Clean Architecture. Tuy nhiên, một số controller và service vẫn cần tiếp tục chuẩn hóa xử lý lỗi và authorization.

### 3.2. Authentication cơ bản

Đã có:

- Đăng ký tài khoản.
- Đăng nhập.
- Hash password bằng PBKDF2.
- JWT access token.
- Các role `Customer`, `Hotel Staff`, `Admin`.
- Seed role.
- Authorization cơ bản bằng `[Authorize]`.
- Lấy User ID từ JWT ở các API đã hỗ trợ.

Các phần còn thiếu:

- Xác minh email/OTP.
- Xác minh số điện thoại.
- Google OAuth2.
- Refresh token.
- Remember Me.
- Khóa tài khoản sau nhiều lần đăng nhập sai.
- Quên mật khẩu và reset password.
- Kiểm tra phone unique.
- Kiểm tra password có chữ hoa, chữ số và ký tự đặc biệt.

### 3.3. Quản lý profile

Đã có:

- `GET /api/me`
- `PUT /api/me`
- Lấy User ID từ JWT, không nhận ID tùy ý từ client.
- Không trả về password hash.
- Cập nhật họ tên, số điện thoại và ngày sinh.
- Validation DTO.

Các phần còn thiếu:

- Avatar.
- Đổi mật khẩu.
- Xác thực lại khi đổi email hoặc số điện thoại.
- Liên kết tài khoản Google.
- Kiểm tra tính duy nhất của email và số điện thoại khi cập nhật.

### 3.4. Hotel CRUD

Đã có các thao tác CRUD hotel, phân trang và xử lý exception cơ bản.

Các vấn đề còn lại:

- Cần xác nhận tất cả API tạo/sửa/xóa chỉ cho phép Admin.
- Chưa có quản lý Hotel Area/Building đầy đủ.
- Chưa có hình ảnh, tiện ích, chính sách và thông tin chi tiết hotel.

### 3.5. Room và Room Type

Đã có:

- CRUD Room.
- CRUD Room Type.
- Liên kết room với hotel, area và room type.
- Phân trang.
- Soft delete/inactive rules.
- Kiểm tra số phòng trùng.
- Room search cơ bản theo tên, giá và trạng thái.

Room search hiện mới phản ánh trạng thái hiện tại và `BasePrice`. Chưa tính chính xác số phòng còn trống theo khoảng Check-in/Check-out.

## 4. Các phần đã làm nhưng chưa hoàn chỉnh

### 4.1. Booking

Đã có:

- Tạo booking.
- Kiểm tra ngày check-in/check-out.
- Kiểm tra trùng lịch ở mức cơ bản.
- Tính số đêm.
- Tính subtotal, VAT, deposit và remaining amount.
- Sinh booking code.
- Booking guests.
- Lịch sử trạng thái.
- Hủy booking.
- Cập nhật trạng thái booking.
- Hold booking khoảng 15 phút trên entity.

#### Vấn đề bảo mật cần sửa ngay

1. `BookingController` cần được bảo vệ bằng `[Authorize]`.
2. Không được fallback User ID về `1` khi JWT thiếu hoặc không hợp lệ.
3. Customer chỉ được xem booking của chính mình.
4. Customer chỉ được hủy booking của chính mình.
5. Admin/Staff phải được giới hạn theo quyền và khu vực được phân công.
6. Cần chống IDOR khi lấy booking theo ID hoặc booking code.

#### Vấn đề nghiệp vụ cần sửa

- Không được lấy `UnitPrice` từ client; giá phải lấy từ database.
- Cần transaction và cơ chế lock chống double booking.
- Cần phân biệt quy trình Deposit và Cash.
- Chưa có voucher.
- Chưa có cancellation policy.
- Chưa có refund workflow.
- Chưa có đổi ngày/đổi phòng.
- Chưa có check-in/check-out đầy đủ.
- Chưa có no-show.
- Chưa có xử lý tự động hold hết hạn.

### 4.2. Payment

Đã có:

- Tạo payment.
- Xác nhận payment.
- Trạng thái Pending/Paid/Failed.
- Kiểm tra số tiền.
- Lịch sử payment.
- Một số kiểm tra quyền theo booking.
- Phân trang payment.

Các vấn đề còn lại:

- `GET /api/payments/{id}` cần kiểm tra quyền sở hữu booking.
- Tạo payment phải xác minh user hiện tại có quyền với booking.
- Staff phải bị giới hạn theo StaffAreaAssignments.
- Chưa có payment gateway.
- Chưa có webhook và kiểm tra chữ ký.
- Chưa có idempotency.
- Chưa có refund gateway và đối soát thanh toán.

## 5. Các chức năng lớn chưa triển khai

### 5.1. Hotel Area/Building

Database đã có `HotelAreas`, nhưng backend chưa có module hoàn chỉnh cho:

- Tạo, sửa, xóa và xem area.
- Phân biệt Zone/Building.
- ParentArea.
- Số tầng.
- Trạng thái active/inactive.
- Kiểm tra parent area cùng hotel.
- Không xóa area đang được sử dụng.

### 5.2. Quản lý Staff và phân công khu vực

Database đã có `StaffAreaAssignments`, nhưng còn thiếu:

- Entity.
- DbSet.
- Repository.
- Service.
- Controller.
- API assign/unassign Staff.
- Khóa/mở tài khoản Staff.
- Xem các area Staff đang phụ trách.
- Authorization theo Area.

Role `Hotel Staff` hiện chỉ thể hiện loại tài khoản, chưa giới hạn được Staff được phép quản lý hotel/area nào.

### 5.3. Amenities và media

Database đã có:

- `Amenities`
- `HotelAmenities`
- `RoomAmenities`
- `HotelImages`
- `RoomImages`

Chưa có:

- CRUD tiện ích.
- Gán tiện ích cho hotel/room.
- Upload/xóa ảnh.
- Chọn ảnh chính.
- Sắp xếp ảnh.
- Lưu media local hoặc Azure Blob Storage.

### 5.4. Giá theo mùa và phụ thu

Mặc dù database có `RoomPriceHistory`, hệ thống hiện mới dùng `RoomType.BasePrice`.

Chưa có:

- Giá theo thời gian.
- Giá ngày lễ/mùa cao điểm.
- Phụ thu người lớn/trẻ em.
- Phụ thu check-in sớm/check-out muộn.
- Chọn đúng giá theo ngày lưu trú.

### 5.5. Voucher

Chưa có implementation cho:

- Tạo và quản lý voucher.
- Thời hạn.
- Giảm theo phần trăm hoặc số tiền.
- Giá trị đơn hàng tối thiểu.
- Số lượt sử dụng.
- Giới hạn mỗi khách hàng.
- Áp dụng voucher trong booking.

### 5.6. Cancellation Policy và refund

Chưa có:

- Cấu hình policy.
- Policy theo hotel/area/room type.
- Tính phí hủy.
- Tính tiền hoàn.
- `REFUND_PENDING`.
- `REFUNDED`.
- Lịch sử refund.

### 5.7. Review và Rating

Chưa có:

- Customer tạo review sau booking Completed.
- Giới hạn mỗi booking một review.
- Chấm điểm 1–5.
- Điểm theo tiêu chí.
- Upload ảnh review.
- Admin duyệt/từ chối review.
- Average rating và review count.
- Chỉnh sửa review trong thời hạn cho phép.

### 5.8. Notification và SignalR

Database có `Notifications`, nhưng chưa có:

- Notification service/repository.
- SignalR Hub.
- Danh sách notification.
- Đánh dấu đã đọc.
- Gửi thông báo khi booking, payment, hủy booking hoặc phản hồi yêu cầu đặc biệt thay đổi trạng thái.

### 5.9. Báo cáo và thống kê

Chưa có dashboard cho Admin về:

- Tổng doanh thu.
- Doanh thu theo thời gian.
- Doanh thu theo hotel/area.
- Occupancy rate.
- Cancellation rate.
- Số booking.
- Trạng thái thanh toán.

## 6. Đối chiếu database với backend

| Bảng | Tình trạng |
|---|---|
| Users | Đã dùng |
| Roles | Đã dùng |
| UserRoles | Đã dùng |
| Hotels | Đã dùng một phần |
| HotelAreas | Chưa có module hoàn chỉnh |
| StaffAreaAssignments | Chưa triển khai |
| Amenities | Chưa triển khai |
| HotelAmenities | Chưa triển khai |
| HotelImages | Chưa triển khai |
| RoomTypes | Đã dùng |
| RoomPriceHistory | Chưa triển khai |
| Rooms | Đã dùng |
| RoomAmenities | Chưa triển khai |
| RoomImages | Chưa triển khai |
| Bookings | Đã dùng một phần |
| BookingDetails | Đã dùng |
| BookingGuests | Đã dùng |
| BookingStatusHistory | Đã dùng một phần |
| Payments | Đã dùng một phần |
| Reviews | Chưa triển khai |
| Notifications | Chưa triển khai |
| Vouchers | Chưa triển khai |
| CancellationPolicies | Chưa triển khai |

Database đang đi trước backend khá xa. Nhiều bảng đã được thiết kế nhưng chưa có entity, repository, service và controller tương ứng.

## 7. Các vấn đề cần ưu tiên

### Mức độ nghiêm trọng cao

1. Bổ sung authorization cho Booking.
2. Xóa fallback User ID bằng `1`.
3. Chống IDOR trên Booking và Payment.
4. Giới hạn Hotel/Room CRUD theo role.
5. Không tin giá phòng do client gửi.
6. Thêm transaction chống overbooking.
7. Kiểm tra StaffAreaAssignments trước khi trả hoặc sửa dữ liệu.

### Mức độ ưu tiên tiếp theo

1. Hotel Area/Building CRUD.
2. Staff account và assignment.
3. Availability theo ngày.
4. Voucher.
5. Cancellation policy và refund.
6. Check-in/check-out.
7. Review/Rating.
8. Notification/SignalR.
9. Amenities và media.
10. Dashboard báo cáo.

## 8. Lộ trình triển khai đề xuất

### Giai đoạn 1: Bảo mật và nền tảng

1. Sửa authorization Booking/Payment/Hotel/Room.
2. Xóa fallback user ID.
3. Thêm ownership và scope validation.
4. Lấy giá từ server.
5. Thêm transaction chống double booking.
6. Xử lý hold hết hạn.

### Giai đoạn 2: Quản trị dữ liệu

1. Hotel Area/Building CRUD.
2. Staff account management.
3. Staff area assignment.
4. Authorization theo khu vực.
5. Amenity mapping.
6. Hotel/Room image management.

### Giai đoạn 3: Hoàn thiện booking

1. Availability theo ngày.
2. Inventory hold.
3. Deposit/Cash workflow.
4. Check-in/check-out.
5. No-show.
6. Đổi lịch/đổi phòng.
7. Cancellation policy.
8. Refund.

### Giai đoạn 4: Chức năng khách hàng

1. Voucher.
2. Review/Rating.
3. Notification.
4. SignalR.
5. Hotel discovery đầy đủ.
6. Payment gateway/webhook.

### Giai đoạn 5: Vận hành

1. Dashboard báo cáo.
2. Logging và audit log.
3. Hoàn thiện frontend React.
4. CI/CD.
5. Azure App Service hoặc AWS.
6. Backup/restore database.
7. Performance và load testing.

## 9. Kết luận

Dự án đã có nền móng tốt ở các phần:

- Clean Architecture.
- EF Core và SQL Server.
- JWT/password hashing.
- User profile.
- Hotel CRUD cơ bản.
- Room/Room Type CRUD.
- Booking/payment skeleton.
- Room search cơ bản.

Tuy nhiên, để đáp ứng đầy đủ yêu cầu đồ án, cần tiếp tục hoàn thiện:

1. Phân quyền Staff theo khu vực/tòa nhà.
2. Admin quản lý Staff và assignment.
3. Availability theo ngày và chống overbooking.
4. Booking/payment/check-in/check-out.
5. Voucher và cancellation/refund.
6. Review/Rating.
7. Notification/SignalR.
8. Hotel discovery đầy đủ.
9. Dashboard báo cáo.
10. Authorization và chống IDOR.

Ưu tiên trước mắt là sửa các vấn đề bảo mật trong Booking và Payment, sau đó triển khai Hotel Area và Staff Area Assignment vì đây là nền tảng cho toàn bộ phân quyền quản lý khách sạn.
