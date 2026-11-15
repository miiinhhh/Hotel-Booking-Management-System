# Bàn giao phần Thuận — 15/11/2026

## Nhánh và phạm vi

- Repository local: `Hotel-Booking-Management-System`, nhánh `feature/hotel-management`.
- Clone nhánh tại `d514f5d`, merge `origin/main` tại `fd88af7` bằng fast-forward. Không có conflict Git hoặc conflict marker cần xử lý. Main đã chứa các commit Hotel trước đó.
- Phạm vi Thuận theo bảng tiến độ được cung cấp: Hotel CRUD/Discovery, Dashboard/Search/Hotel Detail, Amenities/Media, Wishlist, Admin Overview/báo cáo và kiểm thử/tài liệu các phần này.
- Không chỉnh schema, SQL, migration, entity hoặc DbContext. Không chạy script nâng cấp, seed hoặc ứng dụng backend với database thật. Database và mapping giữ nguyên theo main.
- Không sửa logic Auth/Account, Room/RoomType/Inventory, Booking, Payment, Pricing, Voucher, Cancellation, Staff Assignment/Portal hoặc Review. Trang chi tiết chỉ đọc API rating công khai có sẵn của Review.
- Không sửa workbook gốc. Các chỉ dẫn trong tài liệu/README cũ về nâng cấp hoặc seed database không được thực hiện trong lượt này vì yêu cầu giữ nguyên database.

## Đối chiếu công việc

Đối chiếu sheet Thuận (sheet thứ 6), các dòng 8–33 trong workbook người dùng cung cấp. Đây là trạng thái source đã kiểm tra, không phải cập nhật các ô trạng thái của workbook.

| Tuần / dòng | Nội dung | Kết quả |
| --- | --- | --- |
| 1–3 / 8–13 | Phân tích, Git, clone/build | Đã đọc yêu cầu, clone/merge và kiểm tra build. Không thay quy trình chung của nhóm. |
| 4 / 14–15 | Hotel entity/repository/service/CRUD | Giữ code của main; kiểm thử hồi quy toàn backend thành công. |
| 5 / 16–17 | Tên/giá/phân trang, phòng hiển thị và khả dụng | Tái sử dụng inventory hiện có; bổ sung test tổ hợp bộ lọc, giá biên, thứ tự, trang vượt cuối, nhiều phòng cùng loại, hết phòng. |
| 6 / 18–19 | Amenities, upload, ảnh chính, thứ tự, kiểm tra tệp | Giữ API của main và test hiện có; sửa nút Làm mới Admin Content để tải lại thư viện ảnh. |
| 7 / 20–21 | Dashboard/Search/Detail/Overview, responsive | Sửa mất khu vực tìm kiếm; bỏ bộ lọc và đăng ký ưu đãi giả lập; hiển thị mô tả thật; sửa biểu đồ tràn mobile. |
| 8 / 22–23 | Discovery khu vực/ngày/khách/phòng, media/policy, loading/error | Giữ đủ tiêu chí từ Dashboard sang Search và qua phân trang. Xử lý lỗi bộ lọc tiện ích và Wishlist rõ ràng. Rating chi tiết đọc API Review có sẵn. |
| 9 / 24–25 | Dữ liệu kinh doanh và biểu đồ | Giữ API/biểu đồ có sẵn, kiểm tra hợp đồng dữ liệu và nhóm ngày/tuần/tháng. |
| 10 / 26 | Kiểm thử Search/lọc/phân trang/hết phòng | Đã thực hiện backend, adapter frontend và kiểm tra trình duyệt. |
| 10 / 27 | Wishlist và kiểm thử giao diện | Lưu/gỡ/đọc từ API theo tài khoản hiện tại; chặn ghi lặp đang chờ, hủy đọc khi đổi phiên, không áp kết quả của phiên cũ. Sửa test IDOR dùng hai Customer riêng; Staff vẫn bị 403. |
| 11 / 28–29 | Báo cáo, lọc thời gian/hotel, xuất dữ liệu | Kiểm tra JSON/CSV, tiền thu trừ hoàn tiền, không nhân giao dịch theo số phòng; sửa lock giao nhau không làm mất đêm lưu trú đã có. |
| 12 / 30 | Hướng dẫn sử dụng và báo cáo kiểm thử | Tài liệu này và bộ test có thể chạy lại. |
| 12 / 31 | Dữ liệu/ảnh/kịch bản demo | Có fixture kiểm thử cô lập và kịch bản dưới đây; không seed database hoặc bịa ảnh/booking/thanh toán thật. Demo toàn hệ thống cần nhóm cung cấp dữ liệu và ảnh hợp lệ trong database hiện có. |
| 13 / 32–33 | Hồi quy, sửa cuối, bàn giao | Hồi quy code đã qua; bàn giao source trên nhánh `feature/hotel-management`. Nghiệm thu/demo trực tiếp/triển khai là bước thực tế còn lại của nhóm. |

## Thay đổi đáng chú ý

1. SearchCard cho nhập khu vực/tên khách sạn và giữ khu vực khi đổi ngày, chuyển trang hoặc lọc. Dashboard gợi ý khu vực từ danh sách API thay các nút lọc không có tác dụng.
2. Dashboard không còn nhận email rồi báo đã gửi ưu đãi khi chưa có API. Banner hiện chuyển đến tìm phòng thật.
3. Hotel Detail hiển thị Description, tiện ích/chính sách/ảnh có sẵn và rating từ `GET /api/hotels/{id}/rating`. Không trình bày điểm 0 là đánh giá thật hoặc gán sẵn khách sạn 5 sao. Nút bản đồ chỉ xuất hiện khi có thao tác hỗ trợ.
4. Wishlist có trạng thái đang tải/lỗi/tải lại, chỉ gọi khi có `wishlist.self.manage`, bỏ kết quả bất đồng bộ từ phiên cũ và chỉ xác nhận sau ghi/đọc API thành công.
5. Admin Content làm mới lại cả amenities và ảnh. Admin Overview/BusinessCharts dùng kích thước vùng hiển thị, giữ cuộn nội bộ khi nhiều điểm dữ liệu, tránh làm rộng toàn trang.
6. Báo cáo đếm mỗi phòng/đêm một lần. Nếu dữ liệu lock và stay cũ giao nhau, stay vẫn được đếm; chỉ trừ nguồn phòng do lock khi phòng chưa có stay hôm đó. Không sửa lock hoặc booking gốc.

## Sử dụng và ý nghĩa dữ liệu

- Tại Dashboard, nhập khu vực (thành phố/địa chỉ/tên khách sạn), ngày, người lớn/trẻ em và số phòng. Search hỗ trợ tên loại phòng, khoảng giá, tiện ích, sắp xếp giá/tên và phân trang API.
- Stay là `[checkIn, checkOut)`, từ ngày hiện tại tại Asia/Bangkok, tối đa 90 đêm. Người lớn 1–100, trẻ em 0–100, số phòng 1–20. Tổng khách phải vừa số phòng **cùng loại** khả dụng; trẻ em tính vào sức chứa hiện có.
- Giá Discovery là `RoomType.BasePrice` tham khảo. Pricing/Booking của nhóm vẫn xác nhận giá cuối và tồn kho. Bộ lọc giá hiện lọc giá tham khảo này.
- Khách sạn hết phòng trả danh sách rỗng; lỗi máy chủ/thiếu quyền hiển thị lỗi, không thay bằng kết quả thành công giả.
- Customer lưu bằng nút trái tim, xem Yêu thích, tải lại trang và gỡ. Backend dùng identity của token, không nhận UserId tùy ý từ client. Tài khoản thiếu quyền không được cấp quyền mới bởi thay đổi này.
- Admin Overview chọn khoảng `[from, to)` từ 1–366 ngày và khách sạn hoặc toàn hệ thống. Có bảng theo ngày, nhóm biểu đồ ngày/tuần/tháng và Xuất CSV.
- Thu tiền ròng: Payment/Paid trừ Refund/Paid hoặc Refunded theo `PaidAt` UTC, không lấy tổng booking để thay tiền thực thu. Có thể âm do hoàn tiền. Đây là dòng tiền, chưa phải doanh thu kế toán phân bổ theo đêm.
- Booking tạo mới đếm theo `CreatedAt` UTC. Tỷ lệ hủy là các booking tạo trong kỳ đang có trạng thái Cancelled / tổng booking tạo trong kỳ.
- Công suất dựa trên room-night Confirmed/CheckedIn/CheckedOut/Completed và nguồn phòng đang active/serviceable. Không tính Pending hold là đêm đã bán. Nguồn cung là trạng thái hiện tại, không tái tạo lịch sử mở/đóng phòng.
- Policy hiển thị chỉ là nội dung công bố. Cancellation/Payment của nhóm quyết định phí và số tiền hoàn.

## Kiểm thử ngày 15/11/2026

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ backend `dotnet test` | 215 pass, 0 fail, 5 SQL opt-in skip, tổng 220 |
| Riêng Discovery (nằm trong số trên) | 22 pass, 0 fail, 1 SQL opt-in skip |
| Frontend Node tests | 19 pass, 0 fail |
| TypeScript `tsc` | Pass |
| Vite production build | Pass; cảnh báo bundle > 500 kB còn tồn tại |
| Chrome headless, desktop 1440 và mobile 390 | 24 kiểm tra pass; API được chặn bằng fixture, không truy cập database thật |
| Diff schema/SQL/entity/DbContext so với main | Không thay đổi |

Backend dùng InMemory/SQLite của test để kiểm tra service/API. Năm test SQL chỉ chạy khi bật cấu hình riêng; không bật hoặc chạy chúng trong lượt này. Không khẳng định đã kiểm tra SQL Server thật hoặc giao dịch thật. Không dùng kết quả mock trình duyệt để khẳng định hệ thống đã nghiệm thu với dữ liệu triển khai.

Phạm vi kiểm thử mới: lọc trước phân trang, giá biên, kết quả rỗng, tổng số trang/trang vượt cuối, không gộp hai room type thành số phòng yêu cầu, public detail, policy/media/amenities hiện có, ownership Wishlist và quyền Staff, JSON/CSV khớp tiền thu/hoàn, ngày cuối loại trừ, booking hủy, stay trùng, lock trùng/giao nhau, responsive biểu đồ và refresh thư viện ảnh. Trình duyệt còn kiểm tra lưu/gỡ yêu thích, giữ trạng thái sau reload, lỗi ghi/đọc, API tìm kiếm lỗi và export bị khóa khi báo cáo lỗi.

Lệnh chạy lại từ thư mục repository:

```powershell
dotnet test Backend/HotelBooking.Tests/HotelBooking.Tests.csproj
node --test Frontend/tests/*.test.mjs
```

Frontend: cài dependency bằng `npm ci` theo package-lock của main, sau đó `npm run dev` / `npm run build`. Máy thực hiện lượt này không có npm trên PATH nên dùng pnpm từ runtime để cài cục bộ, rồi gọi trực tiếp `node node_modules/typescript/bin/tsc` và `node node_modules/vite/bin/vite.js build`; không thay package.json hoặc package-lock. Các file vendor/build tracked được trả lại đúng main sau kiểm tra.

Smoke UI chạy với Vite tại `http://127.0.0.1:5177` và Playwright có Chromium/Chrome. `PLAYWRIGHT_MODULE` có thể trỏ đến package Playwright đã cài riêng; `PLAYWRIGHT_EXECUTABLE` có thể trỏ đến Chrome; `DISCOVERY_UI_URL` đổi URL Vite. Không cần chạy backend cho smoke UI.

```powershell
# Terminal 1: trong Frontend
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5177 --strictPort
# Terminal 2: trong Frontend, sau khi có Playwright và browser
node tests/discoveryUi.smoke.mjs
```

## Kịch bản demo và các phần còn phụ thuộc

1. Dùng database hiện có của nhóm đã hoạt động theo main. Không chạy script SQL/seed từ tài liệu cũ. Cần có hotel/area/type/room active, vài booking/payment/refund mẫu hợp lệ do nhóm chuẩn bị, hai Customer và một Admin.
2. Tìm khu vực có hotel thật, chọn ngày tương lai, tăng số khách/phòng tới ngưỡng, kiểm tra hết phòng. Kết hợp tên/giá/tiện ích, đổi sort, phân trang.
3. Mở detail, kiểm tra mô tả, check-in/out, policy, ảnh, amenities và rating đã duyệt. Nếu chưa có ảnh thì dùng placeholder đúng trạng thái; nhóm có thể upload ảnh được phép sử dụng qua giao diện sẵn có.
4. Với Customer A lưu/gỡ và reload Wishlist. Đổi Customer B phải có danh sách riêng. Guest được nhắc đăng nhập; Staff không được dùng quyền Customer này.
5. Dùng các module có sẵn tạo booking/lock, tìm lại rồi so kết quả. Không sửa module của người khác để phục vụ demo.
6. Admin đổi thời gian/hotel, đối chiếu tiền thu/hoàn, số booking và room-night, xuất CSV. Với mobile kiểm tra biểu đồ, bảng và thao tác cuộn.
7. Admin Content: thêm/gán tiện ích, upload/chọn ảnh chính/sắp xếp, làm mới và kiểm tra dữ liệu từ API. Các thao tác demo ghi dữ liệu chỉ do nhóm thực hiện sau khi chọn đúng dữ liệu thử.

Các giới hạn giữ nguyên để không vượt phạm vi: checkout/booking nhiều phòng đồng thời còn theo UI Booking của nhóm; schema chưa có dữ liệu đủ cho sao chuẩn khách sạn, loại hình lưu trú, tọa độ bản đồ, chính sách theo độ tuổi hoặc lịch sử nguồn cung. Không thêm cột/bảng để bù các phần này. Chưa nối giá Discovery với tính giá theo mùa của Pricing dù module đó đã có trên main; đang ghi rõ là giá tham khảo và giữ hợp đồng giá cuối hiện có. Bộ lọc/sắp xếp nâng cao theo rating hoặc độ phổ biến trong đặc tả chưa được triển khai trong Discovery hiện tại. Video và nghiệm thu/demo toàn hệ thống với dữ liệu thật chưa được xác nhận. Không ghi các phần này là hoàn tất.
