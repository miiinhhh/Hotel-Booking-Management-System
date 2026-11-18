# Báo cáo đối chiếu chức năng Frontend - API - tài liệu đặc tả

Ngày rà soát: 15/11/2026

## 1. Phạm vi và cách phân loại

Báo cáo được lập bằng cách đối chiếu ba nguồn trong project:

- Đặc tả chức năng: `Database&Docs/Hotel_Booking.md`.
- Mã giao diện: `Frontend/src`.
- API thực tế: các controller trong `Backend/HotelBooking.API/Controllers` và các service tại `Frontend/src/services`.

`đánh giá.md` chỉ được dùng làm tài liệu tham khảo lịch sử vì nhiều nhận xét trong đó đã cũ; một số module từng được ghi là chưa làm hiện đã có API và giao diện.

Quy ước trạng thái:

- **Chưa nối API**: Backend đã có endpoint nhưng giao diện chưa gọi.
- **Chưa có API**: Giao diện đã thể hiện chức năng nhưng Backend chưa có endpoint tương ứng.
- **Một phần**: Đã có luồng chính nhưng thiếu nhánh nghiệp vụ hoặc phạm vi theo tài liệu.
- **Giả lập cục bộ**: Chỉ đổi React state, `localStorage`, hiện `alert` hoặc dùng dữ liệu mặc định; không ghi dữ liệu nghiệp vụ vào CSDL.

## 2. Chức năng đã hiện trên Frontend nhưng chưa hoạt động đầy đủ

| Mã | Phân hệ / giao diện | Hiện trạng trong Frontend | Tình trạng API | Phần còn thiếu | Ưu tiên |
|---|---|---|---|---|---|
| F01 | Customer - Gửi đánh giá kỳ nghỉ | Modal cho chấm sao, tiêu chí, tag, bình luận và ảnh; sau khi gửi chỉ đóng modal và hiện lời cảm ơn. Trang đánh giá riêng còn tạo một booking mẫu khi không có booking thật. | Backend đã có CRUD review theo booking (`POST/GET/PUT/DELETE api/bookings/{id}/review`) nhưng Frontend chưa có `reviewApi` và chưa gọi endpoint. Chưa có API cho ảnh, tag, điểm thưởng và điểm theo từng tiêu chí. | Nối create/update/get review thật; tải review đã có; bỏ booking mẫu; quyết định bỏ hoặc xây API cho ảnh, tiêu chí, tag và điểm thưởng. | P0 |
| F02 | Customer - Điểm đánh giá trên danh sách/chi tiết khách sạn | Mapper `toHotel` và `toHotelDetail` gán cố định `ratingScore = 0`, `reviewCount = 0`, dù giao diện có hiển thị sao và số đánh giá. | Backend có endpoint rating/review riêng nhưng DTO Hotel Discovery chưa trả dữ liệu tổng hợp này và Frontend không gọi bổ sung. | Thêm rating trung bình và số review vào Discovery API hoặc ghép dữ liệu từ Review API. | P1 |
| F03 | Customer - Vé điện tử, tải PDF, Apple Wallet, hóa đơn VAT | Các nút đã xuất hiện trong thẻ booking nhưng chỉ gọi `alert`. | Chưa có endpoint sinh vé, PDF, hóa đơn hoặc pass Wallet. | Thiết kế API tài liệu, kiểm tra ownership booking, tạo file và tải file thật; hoặc ẩn các nút khỏi bản chấm nếu ngoài phạm vi. | P1 |
| F04 | Customer - Thanh toán thẻ quốc tế | Giao diện cho chọn Visa/Mastercard/JCB và mô tả 3D-Secure. | Backend hiện chỉ có VNPay và xác nhận tiền mặt/thủ công; không có cổng thẻ quốc tế. | Tích hợp cổng thanh toán phù hợp hoặc vô hiệu hóa/ẩn lựa chọn để không tạo kỳ vọng sai. | P0 |
| F05 | Customer - Bộ lọc nhanh ở trang khám phá | Các chip “Biệt thự biển”, “Hồ bơi vô cực”, “Nghỉ dưỡng đồi núi”... chỉ thay đổi state; callback tại `Dashboard` không làm gì. | Discovery API chưa nhận các mã filter này. | Ánh xạ chip sang `amenityId`, loại phòng/loại cơ sở lưu trú, hoặc bỏ các chip chưa hỗ trợ. | P1 |
| F06 | Customer - Đăng ký nhận ưu đãi qua email | Form hiện thông báo thành công ngay bằng state cục bộ. | Chưa có API lưu đăng ký hoặc gửi email ưu đãi. | Tạo newsletter/subscription API và cơ chế gửi mail, hoặc thay CTA bằng điều hướng tới đăng ký tài khoản/voucher thật. | P2 |
| F07 | Customer - Checkout khi không có lựa chọn phòng | `App.tsx` và `CheckoutPage.tsx` vẫn dùng `DEFAULT_CHECKOUT_DATA` từ `mockCheckoutData.ts` làm fallback. | Luồng tạo booking thật đã có API. | Không cho mở checkout khi thiếu room/date hợp lệ; chuyển về tìm kiếm thay vì hiển thị resort/phòng mẫu. | P0 |
| F08 | Staff - Đổi lịch / đổi phòng | Nút đã có trong drawer chi tiết nhưng chỉ hiện `alert` “Mở sơ đồ phòng khả dụng”. | Backend đã có `POST api/bookings/{id}/reschedule`; service Frontend `rescheduleBooking` cũng đã viết nhưng không được sử dụng. | Tạo modal chọn ngày/phòng, gọi API, xử lý chênh lệch giá và làm mới booking. | P0 |
| F09 | Staff - Phản hồi yêu cầu đặc biệt | Có nút chấp thuận/từ chối và ô ghi chú; hiện chỉ cập nhật state trong trang. | Chưa có endpoint lưu trạng thái phản hồi, lý do từ chối, nội dung trả lời và gửi thông báo Customer. | Bổ sung model/API phản hồi yêu cầu đặc biệt, audit người xử lý và thông báo cho khách. | P0 |
| F10 | Staff - No-show và hoàn tất/check-out | Backend có endpoint no-show; dashboard có số liệu check-out, nhưng giao diện thao tác chưa gọi no-show và chưa có luồng check-out rõ ràng. | `POST api/bookings/{id}/no-show` đã có; `markNoShow` đã viết nhưng chưa dùng. Generic status API có thể cập nhật trạng thái nhưng UI chưa cung cấp đầy đủ chuyển trạng thái. | Thêm action No-show, Check-out/Completed và kiểm tra state transition phía server. | P1 |
| F11 | Staff - In phiếu xác nhận | Nút in trong bảng booking chỉ hiện `alert`. | Chưa có API/template in phiếu. | Tạo trang in từ dữ liệu booking thật hoặc endpoint PDF; bảo vệ theo phạm vi Staff. | P2 |
| F12 | Staff - Đã đọc thông báo | Danh sách thông báo lấy từ API nhưng ID đã đọc chỉ lưu trong `localStorage` của trình duyệt. | Chưa có API trạng thái đọc theo tài khoản/thiết bị; endpoint hiện chỉ trả danh sách. | Thêm `Notification`, `UserNotificationRead` hoặc endpoint mark-read; badge phải đồng bộ giữa thiết bị. | P1 |
| F13 | Admin - Chuông thông báo | Nút chuông và chấm đỏ luôn hiển thị, không mở danh sách và không gọi API. | Chưa có API thông báo dành cho Admin. | Xây nguồn thông báo hoặc bỏ chấm đỏ/nút khỏi giao diện hiện tại. | P2 |
| F14 | Phân quyền động - Ẩn/hiện module | Header Customer đã lọc một số mục bằng permission, nhưng menu Admin và các tab Staff vẫn khai báo cố định. | Backend đã chặn endpoint bằng `RequirePermission`. | Lọc navigation và action theo permission để quyền bị tắt không còn hiển thị; vẫn giữ kiểm tra Backend làm lớp bảo vệ chính. | P0 |

### Thành phần giả lập đã không còn được dùng chính thức

- `Frontend/src/pages/booking-history/data/mockBookings.ts` hiện không được trang lịch sử booking import trực tiếp; trang đã tải booking từ API. File này có thể xóa sau khi xác nhận không còn test nào dùng.
- Các mảng `ZONES`, `ROOM_TYPES`, `STAFF_MEMBERS`, `VOUCHERS` trong `Frontend/src/pages/admin/data/adminData.ts` không còn được các trang Admin sử dụng; chỉ `ADMIN_NAVIGATION` và hàm format tiền còn được dùng. Đây là dữ liệu cũ nên nên dọn để tránh hiểu nhầm.
- `StaffAddCustomerModal.tsx` tồn tại nhưng không được render ở Staff Portal. Nếu không triển khai nghiệp vụ tạo khách tại quầy thì nên xóa; nếu cần thì phải bổ sung API và quy tắc tạo tài khoản/khách vãng lai.

## 3. API đã có nhưng chưa có màn hình hoặc chưa được Frontend sử dụng

| API / module | Backend hiện có | Khoảng trống Frontend |
|---|---|---|
| Reviews của Customer | CRUD review theo booking; xem review của tôi; xem review/rating khách sạn | Chưa có service gọi API; modal đánh giá đang giả lập. |
| Kiểm duyệt Reviews của Admin | Danh sách review theo hotel, moderation và lịch sử moderation | Admin Portal chưa có mục “Quản lý đánh giá”. |
| Reschedule Booking | `POST /api/bookings/{id}/reschedule` | Service đã tồn tại nhưng nút “Đổi lịch / Đổi phòng” chưa gọi. |
| Mark No-show | `POST /api/bookings/{id}/no-show` | Service đã tồn tại nhưng không có action trên giao diện. |
| Price Surge Rules | Get/create/update/toggle/delete tại `/api/pricing/surge-rules` | `AdminPricing` chỉ quản lý base price và `RoomPriceHistory`; chưa có UI cho quy tắc phụ thu/cao điểm. |
| Lịch sử thanh toán Customer | `GET /api/payments/my-history` và service `getMyPaymentHistory` | Không có trang/lịch sử giao dịch riêng; service chưa được dùng. |
| Chi tiết payment của booking | `GET /api/bookings/{id}/payments` và service `getBookingPayments` | Drawer Customer/Staff chưa tải timeline giao dịch thật. |
| Xóa role tùy chỉnh | `DELETE /api/admin/roles/{roleId}` và `permissionApi.deleteRole` | Trang vai trò chưa có nút xóa role. |
| Hotel CRUD | `GET/POST/PUT/DELETE /api/hotels` | Admin chưa có màn hình tạo/sửa/vô hiệu hóa khách sạn; Inventory chỉ nhận mã hotel để quản lý dữ liệu con. |
| Quản lý Booking của Admin | API danh sách, chi tiết, trạng thái và hủy booking có thể phục vụ Admin theo permission | Admin Portal chưa có module booking; hiện phải đi qua giao diện Staff hoặc Swagger. |

## 4. Đối chiếu các chức năng còn thiếu trong `Hotel_Booking.md`

### 4.1 Customer

| Use case / yêu cầu | Trạng thái hiện tại | Kết luận |
|---|---|---|
| C01 Đăng ký; C02 Đăng nhập; OTP email; Google; reset password; profile | Đã có API và giao diện. Google/Email phụ thuộc cấu hình secret bên môi trường. | Đã triển khai lõi. |
| C03 Tìm kiếm; C04 xem phòng; C05 kiểm tra phòng trống | Discovery, availability và lịch ngày không khả dụng đã nối API. | Đã triển khai lõi; còn thiếu rating thật và các quick filter đang giả lập. |
| C06 Đặt phòng | Checkout gọi calculate-price và create booking; yêu cầu đăng nhập và prefill profile đã có. | Đã triển khai lõi; phải loại bỏ fallback mock checkout. |
| C07 Thanh toán | VNPay và tiền mặt tại khách sạn đã có. | Một phần vì lựa chọn thẻ quốc tế trên UI chưa có Backend. |
| C08 Xem booking; C09 Hủy booking | Danh sách booking, preview phí hủy và hủy booking đã nối API. | Đã triển khai lõi; các tài liệu vé/hóa đơn còn giả lập. |
| C10 Gửi đánh giá | UI đầy đủ nhưng không ghi CSDL. | Chưa hoàn thành. |
| UC tùy chọn - Yêu thích | API wishlist và giao diện lưu/bỏ lưu đã có. | Đã triển khai. |

### 4.2 Hotel Staff

| Chức năng theo đặc tả | Trạng thái hiện tại | Phần còn thiếu |
|---|---|---|
| Tra cứu/lọc booking trong phạm vi được giao | Booking và dashboard lấy từ Staff Portal API; repository có lọc `StaffAreaAssignments`. | Bộ lọc ngày Check-in dạng khoảng ngày chưa hoàn chỉnh; cần tiếp tục giữ kiểm tra ownership ở mọi endpoint. |
| Xem chi tiết booking | Có drawer và dữ liệu khách/phòng/thanh toán/yêu cầu đặc biệt. | Timeline payment chi tiết chưa dùng API payment-by-booking. |
| Xác nhận, check-in, hủy và cập nhật trạng thái | Đã có xác nhận booking, check-in, hủy, thu tiền và hoàn tiền. | Thiếu action check-out/completed, no-show; cần chuẩn hóa state transition. |
| Đổi ngày / đổi phòng và tính lại giá | Backend có reschedule nhưng UI chưa gọi. | Chưa hoàn thành. |
| Lịch phòng và khóa/mở bán khẩn cấp | Calendar và emergency lock/release đã nối API, giới hạn theo khu vực. | Đã triển khai lõi. |
| Phản hồi yêu cầu đặc biệt | UI có nhưng chỉ lưu state. | Chưa có model/API và thông báo cho Customer. |
| Quản lý thông tin vận hành của phòng (S01) | Staff xem phòng/phân khu và khóa bán được. | Chưa có luồng cập nhật trạng thái vận hành chung như Available/Occupied/Maintenance trong phạm vi được giao. |

### 4.3 Admin

| Chức năng theo đặc tả | Trạng thái hiện tại | Phần còn thiếu |
|---|---|---|
| A01 Quản lý khách sạn | Backend có Hotel CRUD; Frontend chỉ đọc hotel trong một số trang. | Thiếu màn hình Hotel CRUD và chọn khách sạn bằng danh sách thay vì nhập ID ở Inventory/Staff assignment. |
| Quản lý Zone / Building | CRUD và ràng buộc cha-con đã có. | Đặc tả yêu cầu ảnh và tiện ích riêng cho khu vực, nhưng Media/Amenity hiện chỉ hỗ trợ Hotel và Room. |
| A02 Loại phòng & tiện ích | CRUD RoomType có; tiện ích/ảnh được quản lý ở Hotel hoặc Room vật lý. | Chưa gắn amenity/image trực tiếp cho RoomType như mô tả tài liệu. |
| A03 Quản lý phòng | CRUD phòng vật lý đã có trong Admin Inventory. | Đã triển khai lõi. |
| Bảng giá & phụ thu | Giá cơ sở và lịch sử giá theo khoảng thời gian đã có; Backend cũng có surge-rule. | UI chưa quản lý surge-rule; chưa có mô hình riêng cho phụ thu người lớn, trẻ em, check-in sớm và check-out muộn như tài liệu. |
| Voucher | CRUD, bật/tắt, validate và áp dụng khi tính booking đã có. | Đã triển khai lõi. |
| Chính sách hoàn/hủy | CRUD policy theo Hotel và preview/tính tiền khi hủy đã có. | Chưa hỗ trợ phạm vi toàn hệ thống, Zone/Building, RoomType hoặc rate package như đặc tả; DTO hiện gắn `hotelId`. |
| Quản lý tài khoản Staff | Danh sách, sửa, khóa/mở và phân công khu vực đã có. | Thiếu tạo tài khoản Staff với mật khẩu ban đầu; Backend `StaffController` không có `POST`. |
| Báo cáo kinh doanh | Dashboard, doanh thu, booking, công suất, tỷ lệ hủy, biểu đồ và CSV đã có. | Bộ lọc hiện theo Hotel; chưa tổng hợp/chọn theo Zone hoặc Building như tài liệu. |
| A04 Quản lý booking | Backend có API. | Admin Portal chưa có màn hình quản lý booking riêng. |
| A05 Quản lý người dùng | Danh sách, sửa, khóa/mở, gán role đã có. | Đã triển khai lõi. |
| A06 Quản lý/kiểm duyệt đánh giá | Backend có moderation và history. | Chưa có giao diện Admin và chưa có service Frontend. |
| Kế thừa quyền Staff | Backend Admin có thể được cấp permission vận hành. | Admin Portal không hiển thị các module Staff; muốn thao tác phải đổi cổng/giao diện. Cần quyết định rõ UX kế thừa hay tách cổng. |

## 5. Các chức năng bổ sung của project hiện tại còn dang dở

Các mục sau không phải toàn bộ đều nằm trong danh sách Use Case C01-A06-S03 ban đầu, nhưng đã xuất hiện trong project hiện tại:

1. **Phân quyền động:** CRUD role/permission và kiểm tra endpoint đã có; thiếu ẩn/khóa menu và action tại Admin/Staff theo permission.
2. **Thông báo:** Staff đã có API tổng hợp thông báo nhưng chưa lưu trạng thái đọc ở server; Admin chưa có luồng thông báo; chưa có SignalR/SSE ở Frontend nên dữ liệu chỉ được tải lại/poll thủ công.
3. **Media:** Upload, ảnh chính, sắp xếp, kiểm tra file và cleanup đã có cho Hotel/Room; review photo, area image và room-type image chưa có scope tương ứng.
4. **Payment history:** API đã có nhưng chưa có màn hình Customer hoặc timeline đầy đủ trong booking detail.
5. **Tài liệu giao dịch:** vé PDF, hóa đơn VAT, Wallet và phiếu xác nhận đang là nút giả lập.

## 6. Thứ tự hoàn thiện đề xuất

### P0 - Nên xử lý trước khi chấm

1. Nối Review UI với Review API và bỏ booking/reward giả lập.
2. Nối nút Staff đổi lịch/đổi phòng với API reschedule.
3. Xây API phản hồi yêu cầu đặc biệt hoặc tạm ẩn action chưa hoạt động.
4. Ẩn lựa chọn thẻ quốc tế và các action tài liệu chưa có Backend nếu không kịp triển khai.
5. Chặn checkout fallback mock khi không có phòng thật.
6. Áp dụng permission lên menu/action Admin và Staff.

### P1 - Hoàn thiện đúng đặc tả nghiệp vụ

1. Admin Booking Management và Admin Review Moderation.
2. Staff check-out, no-show và trạng thái vận hành phòng.
3. UI Price Surge Rule và mô hình các loại phụ thu còn thiếu.
4. Tạo tài khoản Staff từ Admin.
5. Báo cáo theo Zone/Building và chính sách hủy theo phạm vi chi tiết.
6. Rating/review summary trong Hotel Discovery.

### P2 - Chức năng mở rộng

1. Vé PDF, hóa đơn VAT, Wallet và phiếu in.
2. Newsletter/ưu đãi email.
3. Thông báo Admin và trạng thái đã đọc đồng bộ server.
4. Dọn file mock/component/data không còn sử dụng.

## 7. Những phần không nên ghi là “chưa làm” nữa

Qua mã nguồn hiện tại, các phần sau đã có luồng API thực tế và không còn là mock chính:

- Ba cổng đăng nhập Customer/Staff/Admin, JWT refresh/logout, OTP email, Google OAuth và profile.
- Hotel Discovery, tìm theo ngày/số khách/số phòng, availability và lịch phòng không khả dụng.
- Tạo booking, tính giá, voucher, VNPay, thanh toán tiền mặt, preview/hủy booking.
- Wishlist.
- HotelArea Zone/Building, RoomType, Room và emergency lock.
- Amenities/Media của Hotel/Room, ảnh chính và sắp xếp.
- Staff assignment theo Hotel/Zone/Building và giới hạn dữ liệu booking/calendar theo phạm vi.
- Admin quản lý tài khoản, role/permission, voucher, chính sách hủy theo Hotel.
- Dashboard doanh thu, booking, công suất, tỷ lệ hủy và xuất CSV theo Hotel.

Các kết luận trên là kết quả rà soát tĩnh mã nguồn. Để xác nhận hoàn toàn trước khi nộp, cần chạy smoke test với database đang dùng và ba tài khoản Customer/Staff/Admin có dữ liệu thật.
