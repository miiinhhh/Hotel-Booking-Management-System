# CRUD Hotel - Clean Architecture

Phạm vi: thêm, xem danh sách/chi tiết, sửa, xóa Hotel. Căn cứ bảng `Hotels` trong `Database&Docs/Hotel_Booking_Database_Updated.sql` và phần quản lý khách sạn trong tài liệu yêu cầu. Không mở rộng Room, Booking, Payment, JWT hay Frontend. Các thông tin sao, media, review và tiện nghi sẽ thuộc các chức năng sau; không tự thêm cột vào schema hiện tại.

## Code theo layer

| Layer | Thành phần | Trách nhiệm |
| --- | --- | --- |
| Domain | `Entities/Hotel.cs`, `HotelInformation.cs` | Entity, chuẩn hóa chuỗi, trường bắt buộc, giới hạn độ dài, email/website, check-in khác check-out |
| Application | `Hotels/IHotelRepository.cs`, `IHotelService.cs`, `HotelService.cs` | Interface persistence, DTO, các use case CRUD, phân trang, xử lý Hotel không tồn tại |
| Infrastructure | `Persistence/HotelDbContext.cs`, `HotelConfiguration.cs`, `Repositories/HotelRepository.cs` | EF Core SQL Server, map bảng hiện có, lưu dữ liệu, chuyển lỗi khóa ngoại khi xóa thành conflict |
| API | `Controllers/HotelsController.cs`, `ExceptionHandling/HotelExceptionHandler.cs` | Binding, validation cơ bản bằng `[ApiController]`, gọi service, HTTP status/ProblemDetails |

Application chỉ tham chiếu Domain. Domain không phụ thuộc EF Core hay ASP.NET. Infrastructure triển khai interface của Application. Controller không truy cập DbContext/repository. `Program.cs` chỉ bổ sung đăng ký DI, middleware và route cho Hotel; endpoint mẫu weatherforecast hiện có được giữ nguyên để tránh sửa chức năng ngoài phạm vi.

## Chạy trong Visual Studio 2026

1. Mở `Backend/HotelBookingManagementSystem.slnx`. Cần .NET 10 SDK và workload ASP.NET/web development.
2. Đặt `HotelBooking.API` làm Startup Project.
3. Chuẩn bị database SQL Server/LocalDB. Cấu hình mặc định dùng `(localdb)\MSSQLLocalDB`, database `HotelBookingManagementSystem`.
4. Nếu chưa có database, tạo trong SSMS/SQL Server Object Explorer:

```sql
CREATE DATABASE HotelBookingManagementSystem;
```

5. Chọn đúng database vừa tạo và chạy `HotelBooking.Infrastructure/Persistence/Scripts/HotelOnly.sql`. Script chỉ tạo bảng Hotels nếu bảng chưa tồn tại. Nếu đã có database theo SQL của dự án thì không cần tạo lại bảng. API không tự chạy migration, EnsureCreated hay thay đổi bảng của các chức năng khác.
6. Nếu dùng server khác, thêm `ConnectionStrings:HotelDatabase` vào file `HotelBooking.API/appsettings.Development.json` (đã được gitignore) hoặc dùng biến môi trường `ConnectionStrings__HotelDatabase`. Ví dụ Windows Authentication:

```json
{
  "ConnectionStrings": {
    "HotelDatabase": "Server=.;Database=HotelBookingManagementSystem;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

7. Chạy profile `https` bằng F5/Ctrl+F5. Mở `https://localhost:7260/swagger`. Swagger chỉ bật trong môi trường Development.

Có thể chạy bằng CLI từ thư mục repository:

```powershell
dotnet restore Backend/HotelBookingManagementSystem.slnx
dotnet run --project Backend/HotelBooking.API --launch-profile https
```

Nếu máy chưa tin chứng chỉ HTTPS development, chạy `dotnet dev-certs https --trust`.

## API

| Method | Route | Thành công |
| --- | --- | --- |
| POST | `/api/hotels` | 201 + body + Location |
| GET | `/api/hotels?pageNumber=1&pageSize=20` | 200, items/totalCount/pageNumber/pageSize |
| GET | `/api/hotels/{hotelId}` | 200 |
| PUT | `/api/hotels/{hotelId}` | 200, body sau cập nhật |
| DELETE | `/api/hotels/{hotelId}` | 204, không có body |

PUT cập nhật toàn bộ thông tin có thể chỉnh sửa; dùng cùng schema request với POST. HotelId do database sinh; CreatedAt/UpdatedAt do hệ thống quản lý, không nhận từ request. Country mặc định Vietnam, IsActive mặc định true. Giờ dùng định dạng `HH:mm:ss`. Check-out có thể sớm hơn check-in vì là giờ trong ngày, nhưng hai giờ không được bằng nhau theo constraint có sẵn.

```json
{
  "hotelName": "Hotel Demo",
  "description": "Khách sạn trung tâm",
  "address": "123 Nguyễn Huệ",
  "city": "Hồ Chí Minh",
  "country": "Vietnam",
  "phone": "0901234567",
  "email": "hotel@example.com",
  "website": "https://example.com",
  "checkInTime": "14:00:00",
  "checkOutTime": "12:00:00",
  "isActive": true
}
```

Lỗi: 400 với request không hợp lệ, ID <= 0 hoặc phân trang không hợp lệ; 404 khi Hotel không tồn tại; 409 khi xóa bị khóa ngoại chặn hoặc Hotel bị xóa trong lúc lưu cập nhật. DELETE xóa vật lý; nếu muốn ngừng hoạt động mà giữ dữ liệu, PUT `isActive=false`. Không tự xóa Room/Booking để ép xóa Hotel. Không thêm unique HotelName/Email vì schema hiện tại không quy định điều đó.

## Kiểm tra bằng Swagger

1. Vào `/swagger`, chọn POST, Try it out, nhập JSON mẫu, Execute. Ghi lại HotelId và kiểm tra 201/Location.
2. GET danh sách và GET theo HotelId vừa tạo: kiểm tra 200 và đúng nội dung.
3. PUT cùng HotelId với hotelName mới và `isActive=false`: kiểm tra 200; GET lại để xác nhận lưu thực tế.
4. DELETE cùng HotelId: kiểm tra 204. GET/PUT/DELETE lại ID đã xóa: kiểm tra 404.
5. POST thiếu hotelName/email/checkInTime hoặc check-in bằng check-out: kiểm tra 400 và không có bản ghi mới.
6. Trên database có dữ liệu liên quan, thử xóa Hotel đang được HotelAreas/RoomTypes/CancellationPolicies tham chiếu: kiểm tra 409 và dữ liệu vẫn còn. Chỉ thực hiện trên database kiểm thử.

## Kiểm tra bằng Postman

Import `HotelCrud.postman_collection.json`. Collection có 16 request và 23 assertion. `baseUrl` mặc định `https://localhost:7260`; đổi theo cổng máy bạn. Chạy Collection Runner theo thứ tự: collection tự lưu HotelId từ POST, dùng lại để GET/PUT/DELETE và xóa Hotel test cuối luồng. Nếu bị gián đoạn trước DELETE, xóa Hotel test còn lại theo HotelId.

Newman CLI:

```powershell
npx newman run Backend/HotelCrud/HotelCrud.postman_collection.json --env-var baseUrl=https://localhost:7260 --insecure
```

`--insecure` chỉ dùng cho chứng chỉ development localhost. Với chứng chỉ được tin cậy có thể bỏ cờ này.

## Kiểm thử tự động và kết quả

```powershell
dotnet test Backend/HotelBooking.HotelTests/HotelBooking.HotelTests.csproj
```

Kiểm thử dùng WebApplicationFactory với API thật, HotelService và HotelRepository thật; chỉ thay persistence SQL Server bằng SQLite in-memory riêng cho test. Schema mapping SQL Server được kiểm tra thêm bằng GenerateCreateScript mà không kết nối database.

Kết quả đã thực thi: xem `verification.json`. CRUD/validation/pagination và Swagger/OpenAPI đã được chạy bằng HTTP, cùng collection Postman chạy qua Newman trên Kestrel. Chưa chạy against SQL Server/LocalDB thật; chưa thực thi case khóa ngoại 409 trên SQL Server. Cần chạy lại collection trên database SQL Server của máy bạn để xác nhận cấu hình kết nối và môi trường đó. Không coi SQLite test là chứng minh tương đương SQL Server.

JWT/Identity/phân quyền Admin sẽ do phần xác thực tích hợp sau; phạm vi lần này chỉ CRUD Hotel.
