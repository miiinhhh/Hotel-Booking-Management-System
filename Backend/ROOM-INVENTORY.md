# Availability, khóa bán và kho phòng

## Cài đặt database

Chọn đúng database HotelBooking trong SSMS, chạy **Database&Docs/RoomEmergencyLocks.sql** trước khi khởi động bản API mới. Script chỉ thêm bảng RoomEmergencyLocks và index, có thể chạy lại, không xóa dữ liệu cũ. Không chạy lại script tạo toàn bộ database. Không dùng EnsureCreated/Database.Migrate để nâng cấp database có sẵn cho thay đổi này.

Tất cả context Booking/Room/Auth phải trỏ cùng database qua ConnectionStrings:HotelBooking. BookingDbContext đọc các projection của bảng Rooms/RoomTypes/Hotels/HotelAreas/StaffAreaAssignments, không sở hữu migration của các bảng này. Chỉ các configuration trong Data.Configuration được áp dụng cho Booking; tránh kéo configuration Hotel của module khác vào model.

## API

| Method | URL | Quyền |
| --- | --- | --- |
| GET | /api/hotels/{id}/rooms/availability?checkIn=2026-11-01&checkOut=2026-11-03 | Public |
| POST | /api/hotels/{id}/rooms/emergency-locks | Admin hoặc Staff được phân công khu vực |
| GET | /api/hotels/{id}/rooms/emergency-locks | Admin thấy toàn Hotel; Staff thấy phòng trong khu vực được giao |
| PATCH | /api/hotels/{id}/rooms/emergency-locks/{lockId}/release | Admin hoặc Staff được phân công khu vực |
| PATCH | /api/hotels/{id}/room-types/{typeId}/status | Admin, body { "isActive": true/false } |

POST khóa:

```json
{
  "roomIds": [1, 2],
  "startsAt": "2026-11-01T00:00:00+07:00",
  "endsAt": "2026-11-03T00:00:00+07:00",
  "reason": "Bảo trì điều hòa"
}
```

POST trả 201 và một bản ghi khóa cho mỗi RoomId, cùng BatchId cho một lệnh nhiều phòng. Có tối đa 100 RoomId khác nhau. Nếu bất kỳ phòng nào sai Hotel, ngoài phạm vi Staff, bị khóa hoặc có booking chồng lấn, toàn bộ batch bị từ chối. Không tự hủy booking có sẵn. Release theo từng LockId, lặp lại không ghi đè audit của lần mở đầu tiên.

Lưu StartsAt/EndsAt và audit bằng UTC. Status trả về Scheduled/Active/Expired/Released; IsReleased và người/thời điểm mở khóa được lưu trong DB. Staff được phép thao tác phòng trong Area được giao hoặc Building có ParentAreaId được giao; không suy ra quyền từ HotelId do client gửi.

## Quy tắc phòng trống

- Khoảng thời gian theo quy ước **[start, end)**: chạm biên không trùng.
- Availability nhận ngày, quy đổi thành biên 00:00 UTC; khóa có offset được đổi UTC. Đây là quy ước inventory của phiên bản này, chưa phải thời điểm check-in/out địa phương của từng Hotel.
- Room, RoomType, Hotel, Area phải hoạt động; Room có Status Available, đúng quan hệ Hotel/Area.
- Confirmed và CheckedIn chặn phòng. Pending chỉ chặn khi chưa hết HoldExpiresAt (null được coi là giữ chỗ chưa hết hạn để xử lý dữ liệu cũ an toàn). Cancelled/Expired/Completed/CheckedOut không chặn.
- Mọi lệnh khóa chưa release có khoảng chồng lấn đều chặn, kể cả lệnh Scheduled.
- Tạo booking kiểm tra lại tồn kho trong transaction trước khi ghi. Các cập nhật booking sang Pending/Confirmed/CheckedIn cũng kiểm tra lại, loại trừ chính booking đó. Không nhận giá do client quyết định; vẫn dùng BookingPricingService.
- Booking và lệnh khóa cùng lấy SQL Server sp_getapplock với resource theo RoomId, theo thứ tự tăng dần, LockOwner=Transaction. Hai request booking hoặc booking/lock chồng phòng không thể cùng commit. Yêu cầu dùng cùng database và đường ghi này; code/SQL bên ngoài bypass API không được bảo vệ bởi application lock.
- Các API Room CRUD hiện hữu vẫn quản lý trạng thái vật lý; mở khóa lịch không tự đổi Maintenance/Inactive thành Available.

## Frontend

- AdminInventory tải RoomType/Area thật. Thêm/sửa/trạng thái/xóa gọi API và chỉ cập nhật giao diện khi thành công. Xóa là vô hiệu hóa; backend vẫn chặn nếu loại phòng còn Room active.
- StaffSuitesView lấy phân khu/phòng/lệnh khóa thật, hiển thị loading/lỗi, lọc phạm vi phân công và hỗ trợ release.
- EmergencyLockModal chọn RoomId từ backend, nhập thời gian, gửi POST; giữ modal và dữ liệu khi lỗi, chặn submit lặp.
- RoomInventory không dùng danh sách mock để xác định phòng trống. Chọn HotelId thực tế và ngày để gọi availability; chỉ render phòng được trả về. Recheck khi chọn đặt; Booking API còn kiểm tra nguyên tử khi ghi.
- Catalog/hero HotelDetail hiện vẫn có dữ liệu trình bày từ mock của module tìm kiếm. Vì vậy màn hình phòng có trường chọn HotelId thật, hiển thị tên/địa chỉ thật từ API; không tự ánh xạ slug mẫu sang HotelId 1.
- Checkout dùng RoomId/ngày từ kết quả availability; tạo booking thật, bỏ mã booking/voucher giả. Thanh toán thẻ quốc tế chưa tích hợp và bị từ chối rõ ràng; tạo booking không đồng nghĩa thanh toán đã hoàn tất.

## Kiểm thử

```powershell
dotnet test Backend/HotelBooking.Tests/HotelBooking.Tests.csproj
cd Frontend
npm.cmd run build
```

Test InMemory/HTTP bao gồm overlap, chạm biên, pending hết hạn, trạng thái vật lý, batch all-or-nothing, release/audit, Staff ngoài khu vực, Customer/anonymous bị từ chối và recheck khi tạo booking. Có test dịch truy vấn sang SQL Server.

Test cạnh tranh SQL Server dùng database mới `HotelBookingInventoryTests_<GUID>`, tự xóa đúng database đó sau test. Cần tài khoản có quyền tạo/xóa database. Không dùng database ứng dụng để ghi test:

```powershell
$env:HOTEL_INVENTORY_SQLSERVER = 'Server=YOUR_SERVER;Database=master;Trusted_Connection=True;Encrypt=True;TrustServerCertificate=True'
dotnet test Backend/HotelBooking.Tests/HotelBooking.Tests.csproj --filter FullyQualifiedName~RoomInventorySqlTests
```

Nếu backend đang chạy giữ DLL, dừng bằng Ctrl+C hoặc build/test bằng `--artifacts-path "$env:TEMP/hotel-inventory-validation"`.

Kiểm tra thủ công sau khi chạy script: availability → khóa một phòng → availability không còn phòng đó → POST booking cùng phòng/ngày bị từ chối → release → availability có lại phòng. Mở hai cửa sổ gửi booking cùng phòng/ngày: chỉ một request được chấp nhận. Kiểm tra lỗi mạng: UI không báo thành công giả.
