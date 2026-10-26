# Báo Cáo Kết Nối Giao Diện Staff Booking & Admin Staff Với API Backend

## 1. Mục tiêu thực hiện
Kết nối giao diện điều phối đặt phòng của Lễ tân (**Staff Booking**) và quản trị nhân sự/phân công phân khu (**Admin Staff**) với hệ thống Backend ASP.NET Core Web API theo kiến trúc Clean Architecture, đảm bảo khắc phục các lỗi về CORS, xác thực và đồng bộ dữ liệu.

---

## 2. Các công việc đã thực hiện chi tiết

### 2.1. Cấu hình CORS & Reverse Proxy
- **Backend ([Program.cs](file:///D:/Project/Dotnet/Hotel-Booking-Management-System/Backend/HotelBooking.API/Program.cs))**:
  - Đăng ký chính sách CORS `FrontendClient` cho phép domain `http://localhost:5173` và `https://localhost:5173` kèm `AllowCredentials()`, `AllowAnyHeader()`, `AllowAnyMethod()`.
  - Kích hoạt middleware `app.UseCors("FrontendClient")` trước middleware xác thực `UseAuthentication()`.
- **Frontend ([vite.config.ts](file:///D:/Project/Dotnet/Hotel-Booking-Management-System/Frontend/vite.config.ts))**:
  - Cấu hình proxy cho route `/api` trỏ về Backend `http://localhost:5131` giúp hỗ trợ môi trường phát triển linh hoạt.

---

### 2.2. Xây dựng HTTP Client dùng chung ([apiClient.ts](file:///D:/Project/Dotnet/Hotel-Booking-Management-System/Frontend/src/services/apiClient.ts))
- **Tự động gắn JWT Token**: Tự động lấy token từ `localStorage`/`sessionStorage` và thêm vào header `Authorization: Bearer <token>`.
- **Chuẩn hóa phản hồi API**: Khai báo interface `ApiResponse<T>` đồng nhất với chuẩn trả về của Backend (`success`, `data`, `message`, `errors`).
- **Giải mã JWT Token**: Cung cấp hàm `parseJwtPayload()` và `getCurrentUser()` để trích xuất danh tính nhân viên: `userId`, `roles`, `hotelId`, `fullName`.

---

### 2.3. Tích hợp API cho Staff Booking ([StaffBookingsPage.tsx](file:///D:/Project/Dotnet/Hotel-Booking-Management-System/Frontend/src/pages/staff/StaffBookingsPage.tsx) & [bookingApi.ts](file:///D:/Project/Dotnet/Hotel-Booking-Management-System/Frontend/src/services/bookingApi.ts))
- **Tải phân khu trực thuộc**: Tự động gọi API `GET /api/staff/me/assigned-areas` dựa trên `userId` và `hotelId` của nhân viên đăng nhập.
- **Tải danh sách đơn đặt phòng**: Tích hợp `GET /api/bookings` lấy dữ liệu thực tế từ cơ sở dữ liệu, đồng thời chuyển đổi chuẩn xác các trạng thái từ Backend (`Pending`, `Confirmed`, `CheckedIn`, `CheckedOut`, `Cancelled`) sang giao diện.
- **Thao tác Check-in**: Hàm `handleCheckIn` gửi request `PATCH /api/bookings/{id}/status` với trạng thái `CheckedIn`.
- **Thao tác Xác nhận cọc**: Hàm `handleConfirmDeposit` gửi request `PATCH /api/bookings/{id}/status` với trạng thái `Confirmed`.
- **Thao tác Hủy đơn**: Hàm `handleCancelBooking` gửi request `POST /api/bookings/{id}/cancel` kèm lý do hủy đơn.

---

### 2.4. Tích hợp API cho Admin Staff ([AdminStaff.tsx](file:///D:/Project/Dotnet/Hotel-Booking-Management-System/Frontend/src/pages/admin/pages/AdminStaff.tsx))
- **Dữ liệu phân khu từ CSDL**: Modal phân công chuyển sang sử dụng trực tiếp danh sách phân khu `dbAreas` lấy từ API `GET /api/hotels/{id}/staff-assignments/areas`.
- **Bỏ hardcode mapping**: Loại bỏ toàn bộ bảng map tĩnh tên chuỗi (`Tòa A -> 1`, `Tòa B -> 2`), ánh xạ chính xác theo `areaId` của cơ sở dữ liệu.
- **Xử lý phản hồi từ Backend**: Bắt kết quả trả về từ `PUT /api/hotels/{id}/staff-assignments/sync`, hiển thị thông báo lỗi cụ thể khi có sự cố và chỉ cập nhật trạng thái UI khi backend xác nhận thành công.

---

## 3. Danh sách các file thay đổi
1. `Backend/HotelBooking.API/Program.cs` - Bổ sung CORS policy cho Frontend.
2. `Frontend/vite.config.ts` - Thêm proxy `/api` chuyển tiếp về cổng 5131.
3. `Frontend/src/services/apiClient.ts` - Client fetch dùng chung, tự động đính kèm token.
4. `Frontend/src/services/staffAssignmentApi.ts` - Tối ưu hóa các API phân công phân khu sử dụng `apiClient`.
5. `Frontend/src/services/bookingApi.ts` - Bổ sung các API quản lý đơn đặt phòng (danh sách, trạng thái, hủy, xác nhận cọc).
6. `Frontend/src/pages/admin/pages/AdminStaff.tsx` - Nối dữ liệu phân khu động và kiểm tra kết quả đồng bộ.
7. `Frontend/src/pages/staff/StaffBookingsPage.tsx` - Nối API lấy danh sách booking, check-in, xác nhận cọc, hủy booking.
