# Room / RoomType

Luồng: Controller → RoomService (Application) → entity (Domain) / IRoomRepository → RoomRepository + EF Core (Infrastructure).

Schema dùng script `Database&Docs/Hotel_Booking_Database_Updated.sql`. Giá, sức chứa và số giường nằm ở RoomType; Room lấy giá/sức chứa từ loại phòng. Hotel → RoomType → Room, đồng thời Hotel → HotelArea → Room. Không thêm HotelId vào bảng Rooms vì schema hiện tại không có cột này.

## Chạy thử

1. Tạo database SQL Server và chạy script SQL có sẵn vào database đó.
2. Cấu hình `ConnectionStrings:HotelBooking` trong appsettings hoặc biến môi trường `ConnectionStrings__HotelBooking`. Chuỗi mặc định trỏ tới LocalDB/database HotelBooking.
3. Cần Hotel và HotelArea đang hoạt động do module phụ trách khách sạn tạo trước. Entity Hotel/HotelArea ở đây chỉ ánh xạ các trường phục vụ đọc/kiểm tra; không dùng model này để tạo migration toàn bộ database.
4. Chạy `dotnet run --project Backend/HotelBooking.API --launch-profile http` từ thư mục gốc.
5. Sửa hotelId, areaId và các ID trong `HotelBooking.API.http` theo dữ liệu thật. OpenAPI JSON: `http://localhost:5131/openapi/v1.json` trong Development.

## API

| Method | URL | Chức năng |
| --- | --- | --- |
| POST | /api/hotels/{hotelId}/areas/{areaId}/room-types | Tạo loại phòng |
| GET | /api/hotels/{hotelId}/room-types | Danh sách loại phòng |
| GET / PUT / DELETE | /api/hotels/{hotelId}/room-types/{id} | Xem, sửa, vô hiệu hóa loại phòng |
| POST | /api/hotels/{hotelId}/areas/{areaId}/rooms | Tạo phòng |
| GET | /api/hotels/{hotelId}/rooms | Danh sách phòng |
| GET | /api/hotels/{hotelId}/rooms/search | Tìm phòng khả dụng, lọc giá và phân trang |
| GET / PUT / DELETE | /api/hotels/{hotelId}/rooms/{id} | Xem, sửa, vô hiệu hóa phòng |

Status gửi dạng chuỗi: Available, Occupied, Maintenance, Inactive. POST trả 201 kèm Location; DELETE trả 204. Lỗi dữ liệu trả 400, ID không thuộc hotel trả 404, trùng hoặc xung đột trả 409 dưới dạng ProblemDetails.

RoomType Entity nằm trong `HotelBooking.Domain/Entities/RoomType.cs`. API danh sách loại phòng trả 404 nếu Hotel không tồn tại; Hotel tồn tại nhưng chưa có loại phòng trả 200 với danh sách rỗng. Các thao tác xem/sửa/xóa theo ID kiểm tra RoomType thuộc Hotel trên URL. Khi tạo, Area phải thuộc đúng Hotel và cả Hotel/Area phải đang hoạt động.

DELETE loại phòng trả 409 khi vẫn còn Room active sử dụng loại đó. Khi không còn Room active, DELETE chỉ đặt IsActive = false, giữ nguyên các liên kết và dữ liệu; gọi DELETE lại vẫn trả 204. Loại phòng inactive vẫn xem được nhưng không được sửa hoặc gán cho Room mới.

Số phòng duy nhất trong một Area (kể cả phòng inactive), tên loại phòng duy nhất trong Hotel + Area, đúng theo script SQL. RoomType phải thuộc cùng Hotel/Area với Room. Không đổi Hotel/Area khi sửa phòng hoặc loại phòng. Giá không âm và tối đa 2 chữ số thập phân; sức chứa/số giường > 0; tầng >= 0.

DELETE là soft delete: giữ dữ liệu phục vụ booking. Phòng Occupied không được vô hiệu hóa hoặc thay đổi số phòng/loại phòng/tầng. RoomType có phòng active không được vô hiệu hóa. Danh sách trả cả dữ liệu inactive; cập nhật Room với status khác Inactive sẽ kích hoạt lại phòng nếu Hotel, Area và RoomType còn hoạt động.

## Tìm kiếm phòng cho khách hàng

Ví dụ: `GET /api/hotels/1/rooms/search?roomTypeName=deluxe&minPrice=500000&maxPrice=900000&pageNumber=1&pageSize=20`.

- `roomTypeName`: tìm một phần tên loại phòng, bỏ khoảng trắng hai đầu, không phân biệt hoa/thường; rỗng nghĩa là không lọc tên. Tối đa 100 ký tự.
- `minPrice`, `maxPrice`: tùy chọn, so sánh bao gồm hai đầu theo giá tham khảo `RoomType.BasePrice`. Giá phải không âm và không vượt phạm vi decimal(18,2); minPrice không được lớn hơn maxPrice.
- `pageNumber`: mặc định 1, tối thiểu 1. `pageSize`: mặc định 20, từ 1 đến 100. Offset vượt giới hạn int trả 400.
- Chỉ hiển thị Room active và Available, RoomType active, Hotel active, Area active; liên kết Room/RoomType/Area phải cùng khách sạn và phân khu.
- Lọc và đếm tổng số kết quả tại database trước Skip/Take. Sắp xếp theo RoomNumber rồi RoomId để ổn định giữa các trang.
- Trả `items`, `totalCount`, `pageNumber`, `pageSize`, `totalPages`, `message`. Không có kết quả, hotel không có phòng được hiển thị, hoặc trang vượt tập kết quả: HTTP 200 với `items: []` và thông báo. Trang vượt vẫn giữ tổng số kết quả đúng. Query sai: HTTP 400 ProblemDetails.
- API công khai cho khách vãng lai; danh sách quản lý `/rooms` và các API CRUD giữ nguyên hợp đồng.

Luồng mới: RoomsController → IRoomSearchService / RoomSearchService (Application: validate, chuẩn hóa, phân trang và kết quả) → IRoomSearchRepository / RoomSearchRepository (Infrastructure: EF Core) → RoomVisibility (Domain: điều kiện phòng được hiển thị). DI nằm trong các extension của Application/Infrastructure; không thêm logic vào Program.cs.

Đây là tìm kiếm theo trạng thái hiện tại và giá tham khảo. Chưa tính tồn phòng/giá theo Check-in/Check-out, inventory giữ chỗ hoặc giá mùa vụ trong UC-07/UC-08; không dùng kết quả này thay thế bước kiểm tra tồn phòng tại thời điểm tạo booking.

## Chạy test

`dotnet test Backend/HotelBookingManagementSystem.slnx`

Test sử dụng EF InMemory để kiểm tra use case và entity: CRUD, giá/sức chứa, trùng số phòng/tên loại, phạm vi Hotel/Area và soft delete. InMemory không kiểm chứng constraint/collation và transaction SQL Server; cần chạy các request mẫu với SQL Server thật để kiểm chứng tích hợp database.

Project đã tích hợp module xác thực và booking. Module Room vẫn cần gắn quyền quản lý và tích hợp kiểm tra booking trước việc vô hiệu hóa/chuyển trạng thái; trạng thái hiện tại chưa tính khả dụng theo ngày đặt phòng. Giá thay đổi áp dụng cho RoomType hiện tại; lịch sử giá cần tích hợp theo bảng RoomPriceHistory.
