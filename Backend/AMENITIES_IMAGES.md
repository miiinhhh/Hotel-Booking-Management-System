# Amenities và ảnh Hotel / Room

Source giữ nguyên các thư mục của `main`: Controller trong API/Controllers; DTO trong Application/DTOs; interface trong Application/Interfaces; use case trong Application/Services; entity/quy tắc trong Domain/Entities; repository trong Infrastructure/Repositories; mapping, lưu file và cleanup trong Infrastructure/Persistence. Không tạo thêm thư mục source. Các test mới nằm trong HotelBooking.Tests.

## Cập nhật database

Áp dụng `HotelBooking.Infrastructure/Persistence/Scripts/PropertyContent.sql` trên database HotelBooking hiện có, trước khi chạy API mới. Script bổ sung metadata nullable vào HotelImages/RoomImages, unique filtered index cho ảnh chính và bảng hàng đợi xóa file ImageFileDeletions. Có thể chạy lại. Các URL ảnh cũ được giữ nguyên. Nếu gallery cũ có nhiều ảnh chính, giữ ảnh chính đầu tiên theo DisplayOrder/ID; nếu chưa có thì chọn ảnh đầu tiên.

Ví dụ PowerShell (đổi server/database theo cấu hình thực tế):

```powershell
sqlcmd -S 'localhost\SQLEXPRESS02' -d HotelBookingDB -E -C -b -i Backend/HotelBooking.Infrastructure/Persistence/Scripts/PropertyContent.sql
```

Script không tự chạy lúc API khởi động và chưa được áp dụng lên database ứng dụng của bạn. Không dùng EnsureCreated để cập nhật database đang có.

## API

| Method | URL | Chức năng |
| --- | --- | --- |
| GET / POST | /api/amenities | Danh sách active / tạo tiện ích |
| GET / PUT / DELETE | /api/amenities/{id} | Xem / sửa / vô hiệu hóa tiện ích |
| GET | /api/hotels/{hotelId}/amenities | Tiện ích active đã gán cho Hotel |
| PUT / DELETE | /api/hotels/{hotelId}/amenities/{amenityId} | Gán / gỡ tiện ích qua HotelAmenities |
| GET | /api/hotels/{hotelId}/rooms/{roomId}/amenities | Tiện ích active đã gán cho Room |
| PUT / DELETE | /api/hotels/{hotelId}/rooms/{roomId}/amenities/{amenityId} | Gán / gỡ qua RoomAmenities |
| GET / POST | /api/hotels/{hotelId}/images | Xem danh sách / upload ảnh Hotel |
| GET / POST | /api/hotels/{hotelId}/rooms/{roomId}/images | Xem danh sách / upload ảnh Room |

Các thao tác ảnh bên dưới áp dụng cho cả hai đường dẫn gallery ở trên:

| Method | Phần URL nối sau gallery | Chức năng |
| --- | --- | --- |
| GET | /{imageId}/content | Đọc file ảnh local |
| DELETE | /{imageId} | Xóa metadata và đưa file vào hàng đợi xóa |
| PUT | /{imageId}/primary | Chọn ảnh chính |
| PUT | /order | Sắp xếp; JSON `{"imageIds": [3, 1, 2]}` |

POST/PUT Amenity dùng JSON `{"name":"Wi-Fi","description":"Internet miễn phí"}`. Tên được trim, không rỗng, tối đa 100 ký tự, duy nhất; mô tả tối đa 255 ký tự. DELETE là soft delete, giữ liên kết/dữ liệu lịch sử, loại tiện ích khỏi các API đọc. Không gán lại tiện ích đã vô hiệu hóa. PUT gán và DELETE gỡ có thể gọi lặp lại.

Upload dùng multipart/form-data với `file` bắt buộc, `altText` tùy chọn tối đa 255 ký tự và `isPrimary` tùy chọn (mặc định false). POST trả 201 kèm metadata và URL nội dung. Danh sách trả ID, URL, alt text, thứ tự, ảnh chính, ngày tạo UTC, tên gốc, MIME, số byte đã lưu, chiều rộng/cao. Không công khai StorageKey/đường dẫn filesystem.

Reorder phải gửi đủ ID trong đúng gallery, mỗi ID xuất hiện một lần; hệ thống gán DisplayOrder từ 0. Thứ tự đọc là DisplayOrder rồi ImageId. Ảnh Hotel có một ảnh chính cho mỗi Hotel; ảnh Room có một ảnh chính cho mỗi Room. Ảnh đầu tiên tự làm ảnh chính. Chọn ảnh chính sẽ bỏ cờ ở ảnh cũ. Xóa ảnh chính tự chọn ảnh còn lại đầu tiên; gallery rỗng không có ảnh chính. Mỗi gallery tối đa 100 ảnh.

## Quyền và file

- GET công khai; Hotel phải active. GET của Room còn kiểm tra Room/RoomType/Area active và Room thuộc đúng Hotel.
- Mọi POST/PUT/DELETE mới yêu cầu JWT của Admin. Staff và Customer nhận 403; không đăng nhập hoặc tài khoản bị khóa nhận 401. Application kiểm tra lại vai trò đang có trong database trước khi thay đổi nội dung. Không mở rộng quyền Staff chỉ vì có quyền xem khu vực.
- JPEG (`.jpg`/`.jpeg`), PNG (`.png`), WebP (`.webp`), MIME và nội dung phải khớp. Không nhận SVG/GIF hoặc file chỉ đổi đuôi. Ảnh phải giải mã thành công, kích thước không quá 8000px mỗi chiều/24 triệu pixel. File đầu vào và file sau xử lý đều không quá 5 MiB; request multipart giới hạn 6 MiB.
- SkiaSharp giải mã và mã hóa lại ảnh để loại dữ liệu phụ/metadata EXIF; ảnh động chỉ lưu khung đầu tiên. Tên file lưu dùng GUID, không dùng tên/đường dẫn từ client. Header `nosniff` khi đọc file.
- Dùng **local storage** qua IImageStorage. Mặc định lưu trong `uploads` của thư mục chạy ứng dụng, ngoài wwwroot. Đây là thư mục dữ liệu runtime, không phải thư mục source. Có thể đặt đường dẫn tuyệt đối bằng `ImageStorage:LocalRoot` trong appsettings.Local.json hoặc biến môi trường `ImageStorage__LocalRoot`. Cần thư mục bền vững có quyền đọc/ghi khi triển khai.
- Không có implementation Azure trong thay đổi này; chưa cần tài khoản/connection string Azure.
- File được xóa sau khi metadata commit; worker xử lý hàng đợi mỗi 30 giây và retry khi lỗi IO. Sau DELETE, API đọc file trả 404 ngay. Nếu lưu metadata thất bại thông thường, file upload được gỡ và transaction khôi phục ảnh chính cũ. Cần sao lưu cả database và thư mục dữ liệu ảnh.
- URL ảnh legacy được giữ lại; không xóa file ngoài storage local của ứng dụng hoặc tải file từ URL client. Endpoint /content chỉ phục vụ ảnh có metadata local mới.

Các gallery mutation dùng transaction serializable và lock parent Hotel/Room trên SQL Server; unique filtered index ngăn nhiều ảnh chính ngay cả khi có ghi đồng thời. Không thay đổi business logic các module Hotel/Room/Booking/Payment hiện có.

## Kiểm tra

```powershell
dotnet test Backend/HotelBookingManagementSystem.slnx
```

Test API dùng JWT thật và SQLite cho CRUD, liên kết, metadata, file, ảnh chính, reorder, rollback và các quyền. Các test SQL Server chỉ chạy khi cấu hình biến môi trường dưới đây; mỗi test tự tạo và xóa database tạm tên HotelContentTests_..., không dùng database ứng dụng:

```powershell
$env:HOTEL_SQL_TEST_CONNECTION = 'Server=(localdb)\MSSQLLocalDB;Integrated Security=true;TrustServerCertificate=true'
dotnet test Backend/HotelBookingManagementSystem.slnx
```

Test SQL xác minh upload/chọn ảnh chính đồng thời và nâng cấp schema Hotel/Room gốc, chạy lại script, giữ URL legacy. Chúng không kiểm tra các module booking/voucher không thuộc thay đổi này.
