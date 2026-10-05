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
| GET / PUT / DELETE | /api/hotels/{hotelId}/rooms/{id} | Xem, sửa, vô hiệu hóa phòng |

Status gửi dạng chuỗi: Available, Occupied, Maintenance, Inactive. POST trả 201 kèm Location; DELETE trả 204. Lỗi dữ liệu trả 400, ID không thuộc hotel trả 404, trùng hoặc xung đột trả 409 dưới dạng ProblemDetails.

Số phòng duy nhất trong một Area (kể cả phòng inactive), tên loại phòng duy nhất trong Hotel + Area, đúng theo script SQL. RoomType phải thuộc cùng Hotel/Area với Room. Không đổi Hotel/Area khi sửa phòng hoặc loại phòng. Giá không âm và tối đa 2 chữ số thập phân; sức chứa/số giường > 0; tầng >= 0.

DELETE là soft delete: giữ dữ liệu phục vụ booking. Phòng Occupied không được vô hiệu hóa hoặc thay đổi số phòng/loại phòng/tầng. RoomType có phòng active không được vô hiệu hóa. Danh sách trả cả dữ liệu inactive; cập nhật Room với status khác Inactive sẽ kích hoạt lại phòng nếu Hotel, Area và RoomType còn hoạt động.

## Kiểm tra

`dotnet test Backend/HotelBookingManagementSystem.slnx`

Test sử dụng EF InMemory để kiểm tra use case và entity: CRUD, giá/sức chứa, trùng số phòng/tên loại, phạm vi Hotel/Area và soft delete. InMemory không kiểm chứng constraint/collation và transaction SQL Server; cần chạy các request mẫu với SQL Server thật để kiểm chứng tích hợp database.

Module xác thực/phân quyền và booking chưa có trong project. Khi tích hợp, cần gắn quyền quản lý phòng và kiểm tra booking trước việc vô hiệu hóa/chuyển trạng thái; trạng thái hiện tại chưa tính khả dụng theo ngày đặt phòng. Giá thay đổi áp dụng cho RoomType hiện tại; lịch sử giá cần tích hợp người dùng thay đổi theo bảng RoomPriceHistory.
