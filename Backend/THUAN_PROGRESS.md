# Phần việc của Thuận — kiểm tra ngày 26/10/2026

Đối chiếu sheet **Thuận**, các dòng 17–33 trong `Bảng tiến độ.xlsx` người dùng cung cấp. Không sửa trạng thái trong workbook gốc. Source làm trên `feature/hotel-management`; đã merge `origin/main` tại `b8aad7f`, giải quyết conflict DI, exception handler và request mẫu bằng cách giữ cả hai module.

| Dòng / tuần | Công việc | Kết quả trong source |
| --- | --- | --- |
| 17 / 5 | Chỉ trả phòng hiển thị, còn khả dụng, đúng phạm vi | Đã kiểm chứng và bổ sung tìm kiếm theo ngày, loại trừ booking/hold/khóa phòng bằng inventory của main. |
| 18–19 / 6 | Tiện ích, ảnh, ảnh chính, sắp xếp, kiểm tra tệp | Code từ nhánh Hotel giữ lại sau merge; test hồi quy bao gồm các thao tác này. |
| 22 / 8 | Kết nối Discovery theo khu vực/ngày/khách/phòng | Đã làm API và nối Dashboard → Search → Hotel Detail. Các ngày và số khách là input có kiểu, không parse chuỗi ngày hiển thị. |
| 23 / 8 | Amenities/Media, chính sách, loading/error | Chi tiết đọc tiện ích/ảnh thật; có loading/error/rỗng. Thêm chính sách hủy hiển thị do Admin cập nhật, không thay công thức hoàn tiền. |
| 24–25 / 9 | Tổng quan, biểu đồ doanh thu/công suất/booking | Đã làm API Admin có quyền, tính toán ở Application, UI dữ liệu thật, biểu đồ và bảng theo ngày. |
| 26 / 10 | Test tìm kiếm/bộ lọc/phân trang/hết phòng | Test Application, repository, API, frontend adapter và SQL Server thực tế đã chạy. |
| 27 / 10 | Wishlist và kiểm thử giao diện | Lưu/gỡ trên database theo tài khoản hiện tại; có màn hình Yêu thích, nút lưu trên card/chi tiết; không nhận UserId từ client. |
| 28–29 / 11 | Báo cáo doanh thu/công suất/lượt đặt, lọc và export | Đã làm lọc thời gian/khách sạn, xuất CSV có quyền; đã đối chiếu CSV với giao dịch demo SQL Server. |
| 30 / 12 | Hướng dẫn giao diện và báo cáo test | Tài liệu này, hướng dẫn dưới đây, request mẫu `Discovery.http`, bộ test và kết quả kiểm tra. |
| 31 / 12 | Dữ liệu, ảnh và kịch bản demo toàn hệ thống | Có seed Hotel/Area/RoomType/Rooms/Amenities/Policy chạy lại được trên database demo, dùng placeholder có sẵn khi chưa có ảnh. Cần ảnh thật hợp lệ qua upload và dữ liệu các module khác cho buổi demo toàn hệ thống. |
| 32 / 13 | Hồi quy Discovery/Dashboard/Admin Overview | Backend, frontend build/test và kiểm tra trình duyệt với SQL Server tạm đã thực hiện cho phạm vi thay đổi. |
| 33 / 13 | Demo, sửa cuối, bàn giao sản phẩm | Source/tài liệu sẵn để review. Nghiệm thu nhóm, triển khai và bàn giao thực tế vẫn do nhóm thực hiện. |

## Chạy và nâng cấp

1. Giữ connection string database hiện có trong cấu hình local. Không dùng database test cho dữ liệu thật.
2. Chạy các script additive còn thiếu, theo thứ tự, trên database đã có schema: `Database&Docs/RoomEmergencyLocks.sql`, `Backend/HotelBooking.Infrastructure/Persistence/Scripts/PropertyContent.sql`, `Backend/HotelBooking.Infrastructure/Persistence/Scripts/HotelDiscovery.sql`.
3. Chạy SQL Server script với UTF-8, ví dụ: `sqlcmd -S 'localhost\SQLEXPRESS02' -d HotelBookingDB -E -C -I -b -f 65001 -i Backend/HotelBooking.Infrastructure/Persistence/Scripts/HotelDiscovery.sql`. Đổi server/database theo môi trường. Không tự chạy script nâng cấp trên database ứng dụng trong lượt làm việc này.
4. Chạy `dotnet run --project Backend/HotelBooking.API --launch-profile http`. Frontend dùng proxy `/api` → `http://localhost:5131`; ngoài dev cần đặt `VITE_API_URL`/reverse proxy phù hợp.
5. Cài frontend theo package-lock của nhóm và chạy `npm run dev`. Build: `npm run build`.

Không thêm thư mục source mới. DTO/interface/service/entity/repository/controller tiếp tục nằm trong các thư mục sẵn có. `Program.cs` không có business logic mới.

## API mới

| Method | URL | Quyền / ý nghĩa |
| --- | --- | --- |
| GET | /api/discovery/hotels | Công khai; checkIn, checkOut, location, adults, children, rooms, roomTypeName, minPrice, maxPrice, amenityId, sort, page, pageSize |
| GET | /api/discovery/hotels/{hotelId} | Chi tiết công khai theo ngày: chính sách, ảnh, tiện ích và phòng khả dụng |
| PUT | /api/hotels/{hotelId}/policy | Admin; JSON cancellationPolicy, tối đa 2000 ký tự |
| GET / PUT / DELETE | /api/me/wishlist[/{hotelId}] | Tài khoản đăng nhập; danh sách / lưu / gỡ của chính mình |
| GET | /api/admin/reports/overview | Admin; from, to, hotelId tùy chọn |
| GET | /api/admin/reports/export | Admin; cùng bộ lọc, CSV theo ngày |

Ngày lưu trú là `[checkIn, checkOut)`, 1–90 đêm, check-in từ ngày hiện tại tại Asia/Bangkok. Adults 1–100, children 0–100, rooms 1–20. Trẻ em được tính vào sức chứa một cách bảo thủ vì chưa có cấu hình độ tuổi. Mỗi lựa chọn phải đủ số phòng **cùng loại** với sức chứa mỗi phòng nhân số phòng đáp ứng tổng khách. Đây là tìm kiếm nhiều phòng; checkout hiện tại vẫn chọn/đặt từng phòng theo module Booking của nhóm.

Lọc tên/khu vực không phân biệt hoa/thường; dấu tiếng Việt theo collation SQL Server. Khu vực tìm trong tên khách sạn/địa chỉ/thành phố. Giá sử dụng **RoomType.BasePrice tham khảo**, chưa tính mùa vụ/RoomPriceHistory hoặc phụ thu trẻ em. Không công bố sao/điểm review giả khi dữ liệu chưa có. Filter giá áp dụng trước khi đếm/phân trang. Sort: price_asc, price_desc hoặc name; ID là khóa phụ ổn định. Không có kết quả trả 200 với items rỗng và lời nhắc đổi tiêu chí.

Discovery dùng lại truy vấn inventory của main: Hotel/Area/RoomType/Room phải active, quan hệ cùng phạm vi và trạng thái room Available. Loại booking Confirmed/CheckedIn; Pending còn hold hoặc chưa có thời điểm hết hạn; loại khóa khẩn cấp chưa release giao nhau. Cancelled/Expired và hold đã hết hạn không chặn kết quả. Xác nhận lại khi bấm đặt và ở backend Booking vẫn cần thiết.

## Ý nghĩa báo cáo

- Khoảng báo cáo `[from, to)`, 1–366 ngày, theo ngày UTC; không gộp ngày cuối. HotelId lọc theo Room → RoomType.HotelId, BookingDetails chỉ dùng để xác định phạm vi, không nhân bản khoản tiền.
- Thu tiền ròng = Payments Type Payment, Status Paid trừ Type Refund, Status Paid/Refunded, theo PaidAt. Không dùng tổng giá booking thay thế tiền thu, không tính Pending/Failed. Đây là dòng tiền, chưa phải doanh thu kế toán phân bổ theo đêm.
- Lượt đặt là số Booking tạo trong kỳ. Tỷ lệ hủy là các booking trong nhóm này có trạng thái hiện tại Cancelled chia tổng booking trong kỳ; không có booking thì 0.
- Công suất đặt phòng = đêm phòng Confirmed/CheckedIn/CheckedOut/Completed chia đêm có thể bán; mỗi room/day chỉ đếm một lần. Loại các room-night bị khóa; không tính Pending hold là đã bán. Nguồn phòng lấy trạng thái active/serviceable hiện tại, không tái tạo lịch sử mở/đóng phòng. Không dùng chỉ số này thay báo cáo công suất thực tế theo lịch sử nguồn cung.
- CSV chứa Date, Revenue, Bookings, OccupiedRoomNights, AvailableRoomNights. Thu tiền âm do hoàn tiền được giữ nguyên. Không có dữ liệu vẫn có dòng ngày với giá trị 0.
- Nội dung chính sách hủy ở Hotel Detail là thông tin công bố; backend payment/cancellation giữ quyền quyết định phí và hoàn tiền.

## Kịch bản demo phần Thuận

1. Dùng database riêng có tên Demo/Test/Preview; áp dụng schema và script nâng cấp. Chạy `HotelDiscoveryDemo.sql` với `-f 65001`. Script bị chặn trên database ngoài các tên này, không tạo tài khoản/mật khẩu và không sửa booking/thanh toán thật.
2. Trang Khám phá hiển thị khách sạn còn phòng hôm nay từ API. Tìm khu vực **Huế**, ngày tương lai, 4 khách/2 phòng → có Deluxe Demo; tăng lên 5 khách/2 phòng → không có kết quả.
3. Lọc Wi-Fi Demo, giá 500000–500000; đổi tên loại không khớp hoặc khoảng giá sai; kiểm tra thông báo rỗng/400. Phân trang khi có nhiều khách sạn, không giữ số trang/tổng kết quả mock.
4. Mở chi tiết: tên/địa chỉ/check-in/check-out/chính sách/tiện ích đúng database. Khi chưa có ảnh, hiện thông báo/placeholder. Admin có thể dùng API upload JPEG/PNG/WebP thật theo AMENITIES_IMAGES.md, rồi tải lại để thấy ảnh.
5. Đăng nhập tài khoản nhóm đã tạo, lưu khách sạn, mở Yêu thích, refresh, gỡ. Dùng tài khoản khác thấy danh sách riêng. Khách chưa đăng nhập được nhắc đăng nhập.
6. Tạo booking hoặc khóa một phòng bằng module của nhóm; tìm lại 2 phòng cùng ngày không đủ. Hủy/hold hết hạn/mở khóa thì phòng xuất hiện lại theo quy tắc inventory.
7. Vào Admin Overview: chọn ngày/khách sạn, xem số liệu và CSV; so tiền với Payments, so số booking bằng BookingId distinct, so công suất theo room-night. Customer/Staff không vào API báo cáo Admin được.

## Kiểm thử đã thực hiện

- Sau merge: 100 pass, 3 test SQL opt-in bỏ qua khi chưa bật biến môi trường.
- Sau chức năng mới: **120 backend test pass, không skip**, khi bật HOTEL_SQL_TEST_CONNECTION và HOTEL_INVENTORY_SQLSERVER trỏ LocalDB; mỗi test SQL tạo/xóa database tạm riêng.
- **14 frontend test pass**: discoveryApi, roomApi, staffPagination. TypeScript và Vite production build pass. Vite cảnh báo bundle lớn hơn 500 kB, chưa chặn build.
- Trình duyệt: Search → Hotel Detail giữ ngày/khách sạn; ảnh/tiện ích/chính sách đọc API; Admin Overview tải dữ liệu và đổi theo giao dịch demo thật trong database tạm. CSV trả 200/text-csv, số tiền khớp giao dịch.
- Migration chạy lại được; đã sửa SET options để tạo filtered index bằng cả SQL client và sqlcmd. Database ứng dụng thật không bị chỉnh sửa.

Lệnh test:

```powershell
$env:HOTEL_SQL_TEST_CONNECTION = 'Server=(localdb)\MSSQLLocalDB;Integrated Security=true;TrustServerCertificate=true'
$env:HOTEL_INVENTORY_SQLSERVER = $env:HOTEL_SQL_TEST_CONNECTION
dotnet test Backend/HotelBookingManagementSystem.slnx
node --test Frontend/tests/discoveryApi.test.mjs Frontend/tests/roomApi.test.mjs Frontend/tests/staffPagination.test.mjs
```

Chưa push, chưa tự cập nhật workbook, chưa triển khai hoặc xác nhận nghiệm thu thay nhóm. Chưa có review/ratings thật, giá theo mùa vụ/độ tuổi hoặc phòng bán theo inventory lịch sử để thay các giới hạn đã nêu.
