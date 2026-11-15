# Kiểm thử đồng bộ Room / Search / Booking / Staff Calendar

Không cần thêm bảng/cột cho thay đổi đồng bộ này. Database phải có schema và các script nâng cấp của các module đang dùng, bao gồm RoomPriceHistory và PriceSurgeRules.

- Search, hotel detail và availability trả giá trung bình mỗi đêm của khoảng lưu trú. Dùng cùng NightlyRateCalculator với PricingService ở checkout: lịch sử giá, phụ thu, độ ưu tiên và khoảng ngày `[checkIn, checkOut)`. Giá lọc/sắp xếp dùng giá này, không dùng BasePrice. Checkout vẫn tính tổng chính xác theo từng đêm, voucher và các khoản phí; nhân giá trung bình đã làm tròn có thể lệch vài xu so với subtotal.
- Lịch Staff chỉ hiển thị loại phòng/khách sạn/phân khu đang hoạt động trong phạm vi được giao. Phòng bảo trì/occupied/inactive không được tính là còn bán được. Booking và khóa trên cùng phòng/ngày chỉ chiếm một phòng. Ngày trả phòng không chặn đêm tiếp theo; Pending hết hold và Cancelled/Expired không chặn.
- Calendar tự tải lại mỗi 30 giây khi tab đang hiện, khi quay lại tab/cửa sổ, sau khóa bán hoặc khi bấm đồng bộ. Không phải cập nhật realtime qua SignalR. Request cũ khi đổi khoảng lịch hoặc rời màn hình không được ghi đè dữ liệu mới.
- Khi đổi ngày tại chi tiết phòng, xác nhận lại giá, tên loại phòng, sức chứa và availability từ API trước khi chuyển checkout.
- Kết quả kiểm tra ngày mới không được gán vào danh sách phòng của ngày tìm kiếm cũ. Khi đổi khách sạn hoặc tiêu chí từ trang cha, chỉ request mới nhất được cập nhật giao diện; đóng lịch sẽ hủy quyền chuyển checkout của request đang chạy.
- Nếu dịch vụ giá đã được cấu hình nhưng báo lỗi hoặc thiếu phòng trong báo giá, checkout/tạo booking phải báo thất bại, không tự dùng BasePrice để thay thế. Hủy request phải được truyền tiếp.

## Kiểm thử trực tiếp (database local/test)

1. Mở Search và Staff Calendar ở hai tab, cùng khách sạn và khoảng ngày. Chọn dữ liệu trong phạm vi Staff.
2. Đổi tên loại phòng ở Admin, tìm lại theo tên mới, tải lại calendar. Tên mới phải xuất hiện. Vô hiệu hóa loại phòng có phòng active phải bị chặn theo quy tắc hiện tại; dùng loại phòng đủ điều kiện vô hiệu hóa để kiểm tra bị ẩn khỏi cả hai.
3. Thêm lịch sử giá và phụ thu cho một đêm, tìm khoảng hai đêm. So sánh giá trung bình Search / Detail / Availability với subtotal chia số đêm ở checkout; kiểm tra lọc giá theo mức mới. Ngày checkout không được tính tiền.
4. Tạo booking Pending còn hold: số lượng giảm trên Search sau tìm lại và Calendar sau tối đa 30 giây. Hủy hoặc đợi hold hết hạn: số lượng phục hồi. Confirmed/CheckedIn vẫn chặn.
5. Khóa phòng không có booking chồng ngày: số lượng giảm; mở bán lại: phục hồi. Khoảng ngày liền kề không bị ảnh hưởng. Không khóa được phòng bảo trì hoặc ngoài phạm vi.
6. Giữ tab Calendar mở rồi tạo booking ở cửa sổ khác; xác nhận tự tải lại. Chuyển tab rồi quay lại: tải lại ngay. Thử mạng lỗi: hiển thị lỗi và không giả báo dữ liệu đã đồng bộ.

Các test StaffCalendarTests dùng hai InMemory context (phải đồng bộ projection thủ công, không chứng minh SQL concurrency). Test SQL concurrency hiện có yêu cầu HOTEL_INVENTORY_SQLSERVER. Database ứng dụng không bị sửa tự động khi chạy các test mặc định.
