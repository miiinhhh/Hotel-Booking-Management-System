# Phân quyền động

Hệ thống dùng RBAC: `User -> UserRoles -> Roles -> RolePermissions -> Permissions`.
Role quyết định nhóm quyền; `StaffAreaAssignments` tiếp tục giới hạn dữ liệu theo HotelArea.

## Cập nhật database hiện có

`Reviews.sql` không tạo database riêng. `Reviews` và các bảng phân quyền đều thuộc database `HotelBooking`
được tạo bởi `hotelbooking_full.sql`.

Chạy [DynamicAuthorization.sql](../Database&Docs/DynamicAuthorization.sql) một lần trên `HotelBooking` trước khi khởi động API.
Script có thể chạy lại và không xóa user, role, review hay dữ liệu nghiệp vụ.

## Quy tắc bảo mật

- `Admin`, `Customer`, `Hotel Staff` là role hệ thống: không thể xóa hoặc đổi tên.
- Permission của `Admin` được bảo vệ. Admin có thể bật/tắt các permission nghiệp vụ của `Customer`.
- `Customer` có các quyền cá nhân riêng cho hồ sơ, đặt phòng, thanh toán, đánh giá và yêu thích.
- `roles.manage` chỉ thuộc role `Admin`; không thể cấp cho Staff hay role tùy chỉnh.
- Admin chỉ có thể cấp permission mà chính Admin đang có.
- Không thể xóa Admin cuối cùng hoặc tự gỡ role Admin của chính mình.
- `Hotel Staff` là role nền để nhận diện tài khoản nhân viên; các role nghiệp vụ tùy chỉnh được gán thêm.
- Khi role hoặc permission thay đổi, `TokenVersion` của tài khoản bị ảnh hưởng tăng lên và phiên cũ bị thu hồi.

## API quản trị

- `GET /api/admin/permissions`
- `GET|POST /api/admin/roles`
- `PUT|DELETE /api/admin/roles/{roleId}`
- `PUT /api/admin/roles/{roleId}/permissions`
- `GET|PUT /api/admin/users/{userId}/roles`

Tất cả endpoint trên yêu cầu permission `roles.manage`.
