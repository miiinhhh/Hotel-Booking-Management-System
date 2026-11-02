# Review/Rating và kiểm duyệt

## Setup

Trong SSMS chọn database HotelBooking, chạy `Database&Docs/Reviews.sql` trước khi dùng API. Script bổ sung Reviews nếu thiếu, thay default cho đánh giá mới thành Hidden và thêm ReviewModerationHistory/index. Có thể chạy lại; không xóa hoặc tự ẩn các đánh giá Visible có sẵn.

Không chạy lại script tạo toàn bộ database hoặc dùng EnsureCreated cho database ứng dụng đang có dữ liệu. BookingDbContext dùng mapping Reviews tương thích schema cũ; không thêm HotelId vào Reviews. Hotel được xác định từ Rooms → RoomTypes của BookingDetails.

## Nghiệp vụ

- Customer gửi đánh giá cho booking chính mình, chỉ khi BookingStatus = Completed và CheckOutDate <= ngày UTC hiện tại. CheckedOut chưa đủ điều kiện.
- Booking phải có phòng, mọi RoomId phải hợp lệ và thuộc đúng một Hotel. Không suy ra Hotel từ client, không yêu cầu phòng hiện vẫn đang mở bán.
- Rating là số nguyên 1–5; comment tùy chọn, tối đa 2000 ký tự. Mỗi BookingId chỉ có một review; constraint UNIQUE ngăn hai request đồng thời tạo hai đánh giá.
- Review mới là Hidden (chờ duyệt). Schema dùng ba trạng thái Visible / Hidden / Deleted; Hidden bao gồm mới gửi và bị ẩn. Lịch sử giúp phân biệt thao tác kiểm duyệt sau đó.
- Chỉ Admin được kiểm duyệt. Hotel Staff không được duyệt, ẩn hoặc xóa thay khách. Lý do bắt buộc khi Admin ẩn/xóa.
- Khách sửa review sẽ đưa về Hidden để duyệt lại. AuthorDelete và Admin Deleted đều là soft delete, giữ UNIQUE BookingId; không cho khôi phục hoặc tạo lại để né kiểm duyệt.
- History lưu ActorId, trạng thái trước/sau, hành động, lý do và thời gian UTC. Sửa review và ghi history cùng SaveChanges transaction. UpdatedAt là concurrency token: hai thao tác kiểm duyệt/sửa chồng nhau sẽ trả 409, không ghi audit của thao tác thất bại.
- Endpoint public không trả CustomerId, BookingId, email hoặc audit nội bộ. Public và thống kê chỉ dùng Visible của booking vẫn Completed, ngày checkout đã tới và đúng một Hotel; Hidden/Deleted không tính điểm.
- Điểm trung bình là trung bình cộng, làm tròn 2 chữ số; chưa có đánh giá thì AverageRating = null, TotalReviews = 0. Distribution luôn có đủ 1–5 sao. Thống kê truy vấn trực tiếp DB, không có cache cũ sau kiểm duyệt.

## API

| Method | URL | Quyền |
| --- | --- | --- |
| POST | /api/bookings/{bookingId}/review | Customer sở hữu booking |
| GET / PUT / DELETE | /api/bookings/{bookingId}/review | Customer sở hữu booking |
| GET | /api/me/reviews?page=1&pageSize=20 | Customer, chỉ bản thân |
| GET | /api/hotels/{hotelId}/reviews?page=1&pageSize=20 | Public, chỉ Visible |
| GET | /api/hotels/{hotelId}/rating | Public |
| GET | /api/admin/hotels/{hotelId}/reviews?status=Hidden | Admin; bỏ status để xem mọi trạng thái |
| PATCH | /api/admin/hotels/{hotelId}/reviews/{reviewId}/moderation | Admin |
| GET | /api/admin/hotels/{hotelId}/reviews/{reviewId}/history | Admin |

POST/PUT chỉ nhận `{ "rating": 5, "comment": "..." }`. Trường ngoài hợp đồng như customerId, hotelId, status bị từ chối 400. PATCH nhận `{ "status": "Visible", "reason": "..." }`.

POST trả 201 kèm Location, DELETE trả 204. Sai dữ liệu/chưa hoàn tất lưu trú: 400. Chưa đăng nhập/tài khoản bị khóa: 401. Sai quyền hoặc sở hữu: 403. Không có review/booking/Hotel hoặc sai Hotel khi kiểm duyệt: 404. Đánh giá trùng, sửa review đã xóa hoặc xung đột đồng thời: 409.

Phân trang giới hạn pageSize <= 100, thứ tự CreatedAt DESC, ReviewId DESC. API GET theo booking và /me trả cả Hidden/Deleted của chủ tài khoản. ReviewHistory chỉ trả Admin. Đánh giá Completed cũ vẫn có thể gửi nếu chưa từng có review; chưa đặt giới hạn số ngày sau checkout.

## Test

```powershell
dotnet test Backend/HotelBooking.Tests/HotelBooking.Tests.csproj --filter "FullyQualifiedName~ReviewTests|FullyQualifiedName~ReviewApiTests"
```

Test HTTP chạy pipeline JWT thật với database InMemory; kiểm tra vai trò Customer/Staff/Admin, ownership, trường bị chèn trái phép, CreatedAtAction, moderation và public stats. Test nghiệp vụ có rating sai, future checkout, booking không Completed, đa Hotel, trùng review, edit/re-moderation, soft delete và phân trang. Có test dịch query public sang SQL Server.

Test SQL tùy chọn tạo database **HotelReviewTests_<GUID> riêng** rồi xóa đúng database test đó; cần quyền CREATE/DROP DATABASE. Test này kiểm tra script cũ/nâng cấp chạy lại, giữ đánh giá cũ, default Hidden, UNIQUE cạnh tranh, concurrency kiểm duyệt, audit rollback và thống kê SQL thật:

```powershell
$env:HOTEL_REVIEW_SQLSERVER = 'Server=YOUR_SERVER;Database=master;Trusted_Connection=True;Encrypt=True;TrustServerCertificate=True'
dotnet test Backend/HotelBooking.Tests/HotelBooking.Tests.csproj --filter FullyQualifiedName~ReviewSqlTests
```

Request mẫu trong `HotelBooking.API/Reviews.http`. Trên Swagger: đăng nhập Customer → gửi review cho BookingId Completed thực tế → public chưa có đánh giá → đăng nhập Admin duyệt Visible → public có đánh giá và điểm → Admin ẩn → đánh giá và điểm bị loại khỏi public.

Phạm vi lần này là backend/API; chưa nối giao diện gửi review, hàng chờ kiểm duyệt hoặc thay dữ liệu rating mock ở frontend.
