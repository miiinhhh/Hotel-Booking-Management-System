# BÁO CÁO TỔNG HỢP CÁC THAY ĐỔI TRONG WORKSPACE
**Dự án:** Hotel-Booking-Management-System (StayLuxe)  
**Nhánh Git:** `Quy` (Đồng bộ với `origin/Quy`)  
**Ngày thực hiện:** 19/10/2026  
**Mục tiêu:** Báo cáo chi tiết và minh bạch toàn bộ các thay đổi trong workspace để các thành viên dự án nắm bắt, bao gồm dẫn chứng mã nguồn, lý do sửa đổi và kết quả kiểm thử.

---

## 1. TỔNG QUAN CÁC HẠNG MỤC ĐÃ PHÁT TRIỂN & CHỈNH SỬA

Trong quá trình làm việc, hệ thống đã được bổ sung và hoàn thiện 4 khối công việc chính:
1. **Phát triển module Phân công Phân khu Nhân sự (Staff Area Assignment)** từ tầng Domain, Application, Infrastructure, API đến giao diện Frontend (Staff Portal & Admin Portal).
2. **Hoàn thiện module Báo giá & Áp dụng Voucher Thời gian thực (Real-time Booking Pricing Preview & Voucher)** từ tầng nghiệp vụ đến giao diện Checkout của khách hàng.
3. **Khắc phục lỗi kiến trúc EF Core & Cơ sở dữ liệu SQL Server** (phân tách DbContext, bổ sung cột thiếu, xử lý route API).
4. **Kiểm thử End-to-End (E2E) toàn diện & Kết nối API thực tế**, giảm thiểu tối đa sự phụ thuộc vào dữ liệu mẫu (mock data).

---

## 2. CHI TIẾT CÁC THAY ĐỔI THEO TỪNG TẦNG KIẾN TRÚC

### 2.1. Backend - Tầng Domain (Thực thể & Nghiệp vụ cốt lõi)

| Tệp tin | Loại thay đổi | Chi tiết thay đổi & Dẫn chứng |
| :--- | :--- | :--- |
| `Backend/HotelBooking.Domain/Entities/StaffAreaAssignment.cs` | **Tạo mới** | Thực thể quản lý phân công phân khu cho nhân sự: `AssignmentId`, `UserId`, `AreaId`, `AssignedAt`, `AssignedByUserId`, `IsActive`. Liên kết navigation tới `User` và `HotelArea`. |
| `Backend/HotelBooking.Domain/Entities/User.cs` | **Chỉnh sửa** | Bổ sung quan hệ 1-N: `public virtual ICollection<StaffAreaAssignment> StaffAreaAssignments { get; set; } = new List<StaffAreaAssignment>();`. |
| `Backend/HotelBooking.Domain/Entities/Room.cs` | **Chỉnh sửa** | Thêm trường `AreaId` và thuộc tính navigation `public virtual HotelArea Area { get; set; } = null!;` để định danh phòng thuộc phân khu/tòa nhà nào. |
| `Backend/HotelBooking.Domain/Entities/Voucher.cs` | **Xác thực** | Sở hữu trường `UpdatedAt`, các hàm nghiệp vụ `IsValidNow(orderAmount, out reason)` và `CalculateDiscount(orderAmount)`. |

---

### 2.2. Backend - Tầng Application (Giao diện, DTOs & Services)

| Tệp tin | Loại thay đổi | Chi tiết thay đổi & Dẫn chứng |
| :--- | :--- | :--- |
| `Backend/HotelBooking.Application/DTOs/Staff/StaffAreaAssignmentDtos.cs` | **Tạo mới** | Định nghĩa các DTO: `StaffAssignedAreaDto`, `StaffMemberDto`, `AssignStaffAreasRequest`, `StaffAreaSummaryDto`. |
| `Backend/HotelBooking.Application/Interfaces/IStaffAreaAssignmentRepository.cs` | **Tạo mới** | Hợp đồng truy vấn dữ liệu phân công: `GetAssignedAreasByUserIdAsync`, `GetStaffMembersByHotelIdAsync`, `GetHotelAreasWithRoomStatsAsync`, `SyncStaffAreasAsync`, `RemoveAssignmentAsync`. |
| `Backend/HotelBooking.Application/Interfaces/IStaffAreaAssignmentService.cs` | **Tạo mới** | Giao diện dịch vụ nghiệp vụ điều phối phân công nhân sự. |
| `Backend/HotelBooking.Application/Services/StaffAreaAssignmentService.cs` | **Tạo mới** | Triển khai logic nghiệp vụ: kiểm tra quyền hạn, xác thực khu vực thuộc khách sạn, đồng bộ danh sách phân công, gắn kết thống kê số phòng thực tế (`totalRooms`, `availableRooms`, `occupiedRooms`). |
| `Backend/HotelBooking.Application/DependencyInjection.cs` | **Chỉnh sửa** | Đăng ký DI: `services.AddScoped<IStaffAreaAssignmentService, StaffAreaAssignmentService>();`. |

---

### 2.3. Backend - Tầng Infrastructure (Data & Repositories)

| Tệp tin | Loại thay đổi | Chi tiết thay đổi & Dẫn chứng |
| :--- | :--- | :--- |
| `Backend/HotelBooking.Infrastructure/Persistence/HotelBookingDbContext.cs` | **Chỉnh sửa** | Khai báo `DbSet<StaffAreaAssignment>`, cấu hình Fluent API: ánh xạ bảng `StaffAreaAssignments`, cấu hình quan hệ Foreign Key tới `Users` và `HotelAreas`, chỉ mục lọc `IX_StaffAreaAssignments_UserId_AreaId` với `IsActive = 1`. |
| `Backend/HotelBooking.Infrastructure/Data/AuthenticationDbContext.cs` | **Sửa lỗi kiến trúc** | **Nguyên nhân lỗi:** `AuthenticationDbContext` chỉ quản lý xác thực (`Users`, `Roles`, `UserRoles`). Khi `User.cs` có thuộc tính navigation `StaffAreaAssignments`, EF Core của AuthenticationContext tự suy diễn quan hệ và báo lỗi.<br>**Giải pháp:** Thêm `entity.Ignore(x => x.StaffAreaAssignments);` để cô lập hoàn toàn phạm vi trách nhiệm của DbContext. |
| `Backend/HotelBooking.Infrastructure/Repositories/StaffAreaAssignmentRepository.cs` | **Tạo mới** | Thực thi các câu lệnh LINQ / EF Core tối ưu hiệu năng: truy vấn Eager Loading, tính toán trạng thái phòng theo phân khu, thực thi transaction đồng bộ phân khu `SyncStaffAreasAsync`. |
| `Backend/HotelBooking.Infrastructure/DependencyInjection.cs` | **Chỉnh sửa** | Đăng ký DI: `services.AddScoped<IStaffAreaAssignmentRepository, StaffAreaAssignmentRepository>();`. |

---

### 2.4. Backend - Tầng API (Controllers & Routing)

| Tệp tin | Loại thay đổi | Chi tiết thay đổi & Dẫn chứng |
| :--- | :--- | :--- |
| `Backend/HotelBooking.API/Controllers/StaffAreaAssignmentsController.cs` | **Tạo mới** | Cung cấp 5 RESTful endpoints:<br>- `GET /api/staff/me/assigned-areas`: Lấy phân khu trực của nhân viên hiện tại.<br>- `GET /api/hotels/{hotelId}/staff-assignments`: Lấy danh sách nhân viên & phân khu (Admin).<br>- `GET /api/hotels/{hotelId}/staff-assignments/areas`: Lấy danh sách phân khu & số phòng.<br>- `PUT /api/hotels/{hotelId}/staff-assignments/sync`: Đồng bộ phân công phân khu.<br>- `DELETE /api/hotels/{hotelId}/staff-assignments/{assignmentId}`: Hủy phân công. |
| `Backend/HotelBooking.API/Controllers/BookingController.cs` | **Chỉnh sửa** | Bổ sung route alias `[Route("api/bookings")]` song song với `[Route("api/[controller]")]`. Nhờ vậy, Frontend có thể gọi cả dạng số ít (`/api/booking/calculate-price`) lẫn số nhiều chuẩn REST (`/api/bookings/calculate-price`) mà không gặp lỗi `404 Not Found`. |
| `Backend/HotelBooking.API/HotelBooking.API.http` | **Chỉnh sửa** | Bổ sung các request mẫu kiểm thử thủ công qua file HTTP Client. |

---

### 2.5. Cơ sở dữ liệu SQL Server

| Đối tượng | Thao tác thực hiện | Dẫn chứng chi tiết |
| :--- | :--- | :--- |
| **Instance & Chuỗi kết nối** | Đính chính instance máy người dùng | Đã tạo `Backend/HotelBooking.API/appsettings.Local.json` trỏ tới `Server=localhost\SQLEXPRESS01;Database=HotelBookingDb;Trusted_Connection=True;TrustServerCertificate=True;`. |
| **Bảng `Vouchers`** | Bổ sung cột bị thiếu | Đã chạy lệnh SQL: `ALTER TABLE Vouchers ADD UpdatedAt datetime2 NULL;` và gia hạn mã voucher `SUMMER2026` đến `2026-12-31`. |
| **Kịch bản Khởi tạo & Dữ liệu Seed** | Hoàn thiện tệp SQL khởi tạo | Tệp kịch bản khởi tạo chứa đầy đủ 10 bảng dữ liệu (`Users`, `Roles`, `UserRoles`, `Hotels`, `HotelAreas`, `StaffAreaAssignments`, `RoomTypes`, `Rooms`, `Vouchers`, `Payments`) và dữ liệu seed thực tế. |

---

### 2.6. Frontend - Dịch vụ API & Giao diện người dùng

| Tệp tin | Loại thay đổi | Chi tiết thay đổi & Dẫn chứng |
| :--- | :--- | :--- |
| `Frontend/src/services/staffAssignmentApi.ts` | **Tạo mới** | Module gọi Backend API: `getMyAssignedAreas`, `getHotelStaffAssignments`, `getHotelAreas`, `syncStaffAreas`, `removeAssignment`. |
| `Frontend/src/services/bookingApi.ts` | **Kiểm tra & Cập nhật** | Chứa hàm `calculateBookingPrice(request)` kết nối endpoint `/api/bookings/calculate-price`. |
| `Frontend/src/pages/staff/components/StaffSidebar.tsx` | **Chỉnh sửa** | Xây dựng khối giao diện **Active Zone Indicator** động: hiển thị tên phân khu, loại phân khu, số phòng vật lý và dropdown chuyển ca trực. |
| `Frontend/src/pages/staff/StaffBookingsPage.tsx` | **Thay thế mock data bằng API** | Thay vì gán cứng mảng phân khu, trang gọi `getMyAssignedAreas(2, 1)` khi mount component, nạp danh sách phân khu trực tế từ SQL Server (`Zone A: Royal Pavilion`, `Zone B: Ocean Wing`). |
| `Frontend/src/pages/admin/pages/AdminStaff.tsx` | **Thay thế mock data bằng API** | Gọi `getHotelStaffAssignments(1)` và `getHotelAreas(1)` để nạp danh sách nhân viên thật (`Lê Hoàng Nam`, `Trần Thị Thu`). Hàm `saveAssignment` gọi `syncStaffAreas(1, selected.id, areaIds)` để lưu trực tiếp thay đổi vào cơ sở dữ liệu. |
| `Frontend/src/pages/checkout/components/OrderSummaryCard.tsx` | **Chỉnh sửa** | Cho phép hàm `onApplyCoupon` hoạt động theo cơ chế bất đồng bộ (`async / Promise<boolean>`). |
| `Frontend/src/pages/checkout/CheckoutPage.tsx` | **Thay thế mock data bằng API** | Khi khách hàng nhập voucher (`SUMMER2026`, `LUXE2026`), gọi trực tiếp API `calculateBookingPrice(...)` để tính tiền phòng, giảm giá và mức cọc 30% chính xác từ Backend. |

---

## 3. KẾT QUẢ KIỂM THỬ VÀ DẪN CHỨNG CHỨNG MINH

### 3.1. Kết quả Unit Tests (Backend)
Toàn bộ **30/30 unit tests** trong tệp `Backend/HotelBooking.Tests/` đều vượt qua thành công:
```text
Passed!  - Failed: 0, Passed: 30, Skipped: 0, Total: 30, Duration: 1 s - HotelBooking.Tests.dll (net10.0)
```
Bao gồm:
- 14 tests: `BookingPricingTests.cs` (Tính giá phòng, tính giảm giá theo %, giảm số tiền cố định, xử lý ngày hết hạn, đơn hàng dưới mức tối thiểu, cọc 30%, v.v.).
- 10 tests: `StaffAreaAssignmentTests.cs` (Phân công khu vực, đồng bộ phân khu, loại bỏ phân khu, lấy danh sách phân khu nhân sự, thống kê số phòng).
- 6 tests: `RoomTests.cs` (Nghiệp vụ phòng, cập nhật trạng thái phòng).

---

### 3.2. Dẫn chứng phản hồi API thực tế (Live Backend Response)

**1. Tính giá & Voucher thực tế (`POST /api/bookings/calculate-price`):**
```json
{
  "success": true,
  "message": "Tính toán giá đặt phòng thành công.",
  "data": {
    "checkInDate": "2026-11-01",
    "checkOutDate": "2026-11-04",
    "numberOfNights": 3,
    "roomBreakdowns": [
      {
        "roomId": 1,
        "roomNumber": "P.101",
        "roomTypeId": 1,
        "roomTypeName": "King Classic Ocean View",
        "unitPricePerNight": 3850000.00,
        "numberOfNights": 3,
        "subTotal": 11550000.00
      }
    ],
    "subTotal": 11550000.00,
    "voucherCode": "SUMMER2026",
    "voucherId": 2,
    "discountAmount": 1732500.00,
    "voucherMessage": "Áp dụng thành công mã ưu đãi SUMMER2026: Giảm 1.732.500đ.",
    "subTotalAfterDiscount": 9817500.00,
    "feeRate": 0.05,
    "feeAmount": 490875.00,
    "taxRate": 0.10,
    "taxAmount": 1030837.50,
    "totalAmount": 11339212.50,
    "paymentMethod": "Deposit",
    "depositPercentage": 30,
    "depositAmount": 3401763.75,
    "remainingAmount": 7937448.75
  },
  "errors": null
}
```

**2. Danh sách phân khu phụ trách (`GET /api/staff/me/assigned-areas?userId=2&hotelId=1`):**
```json
{
  "success": true,
  "message": "Lấy danh sách phân khu phụ trách thành công.",
  "data": [
    {
      "areaId": 1,
      "hotelId": 1,
      "areaName": "Zone A: Royal Pavilion",
      "areaType": "Zone",
      "totalRooms": 2,
      "availableRooms": 2,
      "occupiedRooms": 0,
      "isActive": true
    },
    {
      "areaId": 2,
      "hotelId": 1,
      "areaName": "Zone B: Ocean Wing",
      "areaType": "Zone",
      "totalRooms": 1,
      "availableRooms": 1,
      "occupiedRooms": 0,
      "isActive": true
    }
  ]
}
```

---

## 4. TÌNH TRẠNG GIT REPOSITORY
- Nhánh hiện tại: `Quy`
- Toàn bộ commit đã được push an toàn lên GitHub: `origin/Quy`
- Không sử dụng `--force` push, đảm bảo lịch sử git của toàn đội được giữ nguyên vẹn.
- Trạng thái thư mục làm việc: `working tree clean`.
