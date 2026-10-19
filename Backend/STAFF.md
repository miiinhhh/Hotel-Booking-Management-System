# Quản lý Staff

Staff là User có role `Hotel Staff`, dùng bảng Users/UserRoles/Roles sẵn có, không cần migration mới.

## Phạm vi quyền

- Admin xem danh sách/chi tiết và sửa hồ sơ Hotel Staff; khóa hoặc mở tài khoản Staff.
- Hotel Staff chỉ xem danh sách chứa chính mình, xem chi tiết và sửa hồ sơ chính mình. Không được xem/sửa nhân viên khác hoặc khóa/mở tài khoản.
- Customer nhận 403; request thiếu JWT hoặc tài khoản đã khóa/đã xóa nhận 401 trên endpoint được bảo vệ.
- Chưa có mô hình phân công Hotel trong module tài khoản, vì vậy chưa cho Staff quản lý đồng nghiệp theo khách sạn.
- Endpoint quản lý Staff không khóa/mở tài khoản có role Admin, kể cả khi có thêm role Hotel Staff.

## API

| Method | URL | Nội dung |
| --- | --- | --- |
| GET | /api/staff?page=1&pageSize=20 | Danh sách theo quyền; pageSize tối đa 100 |
| GET | /api/staff/{id} | Chi tiết Staff |
| PUT | /api/staff/{id} | Sửa fullName, phone, dateOfBirth |
| PATCH | /api/staff/{id}/status | Admin gửi `{ "isActive": false }` để khóa; true để mở |

Ví dụ PUT:

```json
{
  "fullName": "Nguyen Van An",
  "phone": "+84901234567",
  "dateOfBirth": "2000-01-01"
}
```

Không nhận role, email, password, isActive trong PUT hồ sơ. Các trường ngoài hợp đồng bị từ chối 400, gồm cả PUT /api/me. Không có API thay đổi phân quyền trong tính năng này. Response không trả password hash.

GET /api/staff trước đây là endpoint minh họa quyền; được thay bằng danh sách Staff. Endpoint minh họa chuyển sang /api/staff/resource.

## Kiểm tra JWT và khóa tài khoản

Login đã kiểm tra IsActive. Sau khi chữ ký/hạn dùng JWT hợp lệ, ActiveAccountJwtEvents truy vấn User trong database: tài khoản không tồn tại hoặc inactive bị từ chối. Quyền được lấy lại từ UserRoles, nên role cũ trong JWT không tiếp tục cấp quyền sau khi bị thu hồi. Kiểm tra áp dụng cho mọi request Bearer JWT; endpoint public vẫn có thể truy cập ẩn danh.

Khóa có hiệu lực với các request xác thực tiếp theo, không hủy request đang xử lý. Mở khóa cho phép JWT cũ chưa hết hạn được sử dụng lại. Mỗi request xác thực có thêm truy vấn database; không dùng cache trạng thái để tránh trì hoãn khóa tài khoản.

## Test

```powershell
dotnet test Backend/HotelBooking.Tests/HotelBooking.Tests.csproj
```

Test HTTP chạy qua pipeline JWT/authorization thật, dùng EF InMemory thay SQL Server. Bao gồm Admin/Staff/Customer/anonymous, phạm vi truy cập, khóa và mở tài khoản, login bị khóa, JWT đã cấp, role bị thu hồi và chèn trường phân quyền. Không kiểm chứng constraint/collation SQL Server.

Để test Swagger: đăng nhập bằng các tài khoản có role được nhóm cấp sẵn, Authorize JWT, gọi GET/PUT/PATCH trên. Dùng Admin khóa Staff rồi thử lại JWT Staff đã lấy trước khi khóa: request bảo vệ phải trả 401. Tính năng không cung cấp API tự tạo Staff hoặc tự cấp role.
