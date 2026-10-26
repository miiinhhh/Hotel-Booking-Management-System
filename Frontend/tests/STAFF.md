# Kiểm tra quản lý Staff

Chạy `npm run test:staff` và `npm run build` trong Frontend.

Kiểm tra thủ công với backend đang chạy và tài khoản Admin:

1. Có hơn 20 Staff: trang Accounts phải hiển thị tổng toàn bộ, nút Sau mở trang kế tiếp. Tìm một Staff không nằm trong 20 dòng đầu: vẫn tìm được. Lọc trạng thái phải áp dụng cho toàn bộ danh sách.
2. Chuyển bộ lọc khi đang ở trang cuối: quay về trang 1, không xuất hiện trang rỗng do chỉ số trang cũ.
3. Trang Staff: không xuất hiện dữ liệu STAFF_MEMBERS, ca làm việc hoặc số liệu giả. Nếu database trống, hiển thị trạng thái rỗng.
4. Khóa/mở Staff ở một trong hai trang: tab Network có PATCH /api/staff/{id}/status; tải lại trang phải giữ trạng thái đã lưu. Khi API lỗi, trạng thái cũ được giữ và thông báo lỗi hiển thị.
5. Chọn mã Hotel hợp lệ, phân công khu vực có AreaId bất kỳ (không chỉ 1/2/3), cho nhân viên có UserId lớn hơn 1000. PUT sync phải gửi đúng ID; tải lại phải thấy phân công đã lưu.
6. Giả lập lỗi sync: modal còn mở, không hiện toast thành công, không thay đổi phân công trong bảng.
7. Đổi Hotel: dữ liệu phân công cũ được xóa trong lúc tải, chỉ dùng khu vực của Hotel mới.

Hiện backend không có API tạo tài khoản Staff. Nút thêm Staff bằng state đã được bỏ; tài khoản Staff phải được tạo/cấp quyền qua quy trình quản trị hiện có. Chức năng này không thêm API cấp quyền mới.

Accounts và Staff tải đủ các trang API trước khi tính thống kê/lọc, rồi phân trang giao diện 20 dòng. Nếu một trang tải lỗi, không hiển thị dữ liệu một phần như tổng hoàn chỉnh. Với số lượng Staff rất lớn, nên bổ sung API lọc và thống kê phía server để giảm dữ liệu tải về.
