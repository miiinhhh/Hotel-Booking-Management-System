# Hotel Booking 

Minh Nguyễn Khả 

September 2026 

## **Mục lục** 

|**1**|**Giớ**|**i thiệu**|**2**|
|---|---|---|---|
||1.1|Mục tiêu ứng dụng . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>2|
||1.2|Phạm vi đềtài<br>. . . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>2|
|**2**|**Yêu**|**cầu kỹthuật**|**2**|
||2.1|Công nghệbắt buộc<br>. . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>2|
||2.2|Kiến trúc Clean Architecture<br>. . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>3|
|**3**|**Đặc**|**tảnhân viên**|**3**|
||3.1|Đặc tảchi tiết . . . . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>4|
||3.2|Đặc tảAdmin . . . . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>8|
||3.3|Đặc tảchi tiết . . . . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>8|
||3.4|Đặc tảchức năng phân hệkhách hàng<br>. . . . . . . . . . .|. . . . . . . . . . . .<br>12|
|**4**|**Sơ đ**|**ồUse Case**|**28**|
||4.1|Danh sách Actor<br>. . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>28|
||4.2|Danh sách Use Case<br>. . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>29|
|**5**|**Các **|**yêu cầu phi chức năng**|**30**|
||5.1|Security – Bảo mật . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>30|
||5.2|Performance – Hiệu năng . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>31|
||5.3|Availability – Tính sẵn sàng . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>31|
||5.4|Usability – Tính dễsửdụng . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>31|
||5.5|Responsive – Tương thích thiết bị. . . . . . . . . . . . . .|. . . . . . . . . . . .<br>32|
||5.6|Backup – Sao lưu . . . . . . . . . . . . . . . . . . . . . . .|. . . . . . . . . . . .<br>32|



1 

## **1 Giới thiệu** 

### **1.1 Mục tiêu ứng dụng** 

Xây dựng một hệthống đặt phòng khách sạn trực tuyến cho phép khách hàng dễdàng tìm kiếm và xem thông tin của nhiều khách sạn trong khu vực, kiểm tra tình trạng phòng, lựa chọn phòng, so sánh giá, thực hiện đặt phòng và quản lý các đặt phòng của mình. Hệthống hỗtrợ khách hàng lựa chọn hình thức thanh toán đặt cọc hoặc thanh toán bằng tiền mặt khi nhận phòng. Đồng thời, hệthống hỗtrợquản trịviên và nhân viên khách sạn quản lý thông tin khách sạn, phòng, giá phòng, đặt phòng, khách hàng, trạng thái phòng và doanh thu một cách hiệu quả. 

### **1.2 Phạm vi đềtài** 

Đềtài tập trung xây dựng một hệthống hỗtrợđặt phòng trực tuyến cho nhiều khách sạn trong một khu vực địa lý xác định. Hệthống cho phép khách hàng tìm kiếm và so sánh thông tin các khách sạn, phòng, giá phòng và tình trạng phòng, thực hiện đặt phòng và lựa chọn hình thức thanh toán đặt cọc hoặc thanh toán bằng tiền mặt khi nhận phòng. Đồng thời, hệthống cung cấp các chức năng quản lý cho quản trịviên và nhân viên khách sạn, bao gồm quản lý thông tin khách sạn, loại phòng, phòng, giá phòng, đặt phòng, khách hàng và trạng thái phòng. 

## **2 Yêu cầu kỹthuật** 

### **2.1 Công nghệbắt buộc** 

#### **2.1.1 Frontend** 

- React 18+ với TypeScript. 

- React Router v6+, Axios hoặc Fetch API. 

- CSS: Tailwind CSS hoặc CSS Modules. 

- Client SignalR cho thông báo real-time . 

#### **2.1.2 Backend** 

- ASP.NET Core 8+ Web API 

- Clean Architecture: Domain, Application, Infrastructure, API (Presentation). 

- ORM: Entity Framework Core 8+ 

- CSDL: SQL Server 

- Xác thực: JWT + ASP.NET Core Identity 

- Tài liệu API: Swagger/OpenAPI (/swagger). 

2 

- Real-time: SignalR (Hub thông báo). 

- Lưu file media: thư mục local hoặc Azure Blob Storage 

#### **2.1.3 Triển khai thêm** 

- Triển khai lên Azure App Service / AWS 

- Pipeline GitHub Actions hoặc Azure DevOps 

### **2.2 Kiến trúc Clean Architecture** 



Hình 1: Các thư mục tổchức 

Quy tắc phụthuộc: Domain không phụthuộc layer khác; Application chỉphụthuộc Domain; Infrastructure implement interface từApplication/Domain; API gọi Application và Infrastructure, không gọi trực tiếp DbContext trong Controller. 

## **3 Đặc tảnhân viên** 

#### **Nguyên tắc phân quyền theo phân khu/tòa nhà:** 

Mỗi tài khoản Hotel Staff được Admin phân công phụtrách một hoặc nhiều phân khu/tòa nhà cụthểtrong hệthống. Sau khi đăng nhập, giao diện làm việc của Staff mặc định chỉhiển thịdữliệu thuộc phân khu/tòa nhà được phân công, bao gồm đơn đặt phòng, lịch phòng, loại phòng và sốlượng phòng khảdụng. 

Staff không được phép xem hoặc thao tác trên dữliệu thuộc phân khu/tòa nhà mà mình không được phân công. 

3 

|Bảng 1: Các chức năng của nhân viên|
|---|



|**Tên chức năng**|**Mô tảtóm tắt**|**Input**|**Output**|
|---|---|---|---|
|Tra cứu & Lọc<br>đơn đặt phòng|Tìm kiếm đơn theo<br>nhiều tiêu chí và giới<br>hạn dữliệu theo phân<br>khu/tòa<br>nhà<br>được<br>phân công|Mã booking, Tên KH,<br>SĐT, Ngày check-in,<br>Trạng thái đơn, Phân<br>khu/Tòa nhà|Danh<br>sách<br>booking<br>thỏa mãn điều kiện và<br>thuộc phạm vi được<br>phân công|
|Xem chi tiết đặt<br>phòng|Xem thông tin khách<br>hàng, phòng và yêu<br>cầu<br>đặc<br>biệt<br>của<br>booking|Chọn một đơn đặt<br>phòng từdanh sách|Màn<br>hình<br>chi<br>tiết<br>booking đầy đủ|
|Cập nhật trạng<br>thái đơn|Chuyển<br>trạng<br>thái<br>booking<br>theo<br>quy<br>trình nghiệp vụ|Chọn trạng thái: Xác<br>nhận / Hoàn tất / Đã<br>hủy|Cập nhật CSDL và gửi<br>thông báo cho khách<br>hàng|
|Hỗtrợđổi / hủy<br>phòng|Hỗ<br>trợ<br>khách<br>hàng<br>thay đổi lịch hoặc hủy<br>booking|Ngày mới, loại phòng<br>mới hoặc lý do hủy|Tính chênh lệch giá và<br>cập nhật lại tồn phòng|
|Xem lịch phòng<br>trống|Theo<br>dõi<br>số<br>lượng<br>phòng trống theo ngày<br>và theo từng phân khu|Khoảng ngày, loại<br>phòng, phân khu/tòa<br>nhà|Bảng lịch hiển thịsố<br>phòng<br>còn<br>trống/đã<br>đặt|
|Khóa / mở<br>phòng khẩn cấp|Đóng<br>bán<br>phòng<br>tạm thời theo phân<br>khu/tòa<br>nhà<br>được<br>phân công|Phân khu/tòa nhà,<br>loại phòng, ngày cần<br>khóa, sốlượng, lý do|Cập nhật tồn kho và<br>trạng thái phòng|
|Phản hồi yêu cầu<br>khách hàng|Xửlý các yêu cầu đặc<br>biệt của khách hàng|Nội dung yêu cầu,<br>trạng thái xửlý, nội<br>dung phản hồi|Ghi nhận vào booking<br>và gửi thông báo cho<br>khách|



### **3.1 Đặc tảchi tiết** 

#### **3.1.1 Quản lý & Tra cứu Đơn đặt phòng** 

**Mô tả:** Cho phép nhân viên kiểm soát các booking phát sinh từwebsite trong phạm vi phân khu/tòa nhà được Admin phân công. 

**Luồng chính (Main Flow):** 

1. Nhân viên đăng nhập vào hệthống và truy cập trang “Danh sách đơn đặt phòng”. 

2. Hệthống xác định các phân khu/tòa nhà mà tài khoản Staff được phân công. 

3. Hệthống mặc định chỉhiển thịcác booking thuộc phạm vi được phân công. 

4. Nhân viên có thểsửdụng bộlọc: Mã booking, Họtên/SĐT khách hàng, Khoảng ngày Check-in, Trạng thái booking và Phân khu/Tòa nhà. 

5. Nhân viên chọn một booking đểxem chi tiết. 

4 

6. Hệthống hiển thị: 

   - Thông tin khách hàng. 

   - Tên khách sạn. 

   - Phân khu/Tòa nhà. 

   - Loại phòng. 

   - Sốlượng phòng. 

   - Ngày Check-in/Check-out. 

   - Trạng thái booking. 

   - Trạng thái thanh toán. 

   - Sốtiền đã cọc và sốtiền còn lại. 

   - Yêu cầu đặc biệt của khách hàng. 

#### **Quy tắc nghiệp vụ:** 

- Staff chỉđược xem booking thuộc phân khu/tòa nhà được phân công. 

- Hệthống phải kiểm tra quyền truy cập trước khi trảvềthông tin booking. 

- Staff không được truy cập trực tiếp booking thuộc phạm vi của Staff khác. 

#### **3.1.2 Xửlý trạng thái & Thay đổi Booking** 

**Mô tả:** Cho phép nhân viên tiếp nhận và xửlý các yêu cầu xác nhận thanh toán, thay đổi lịch lưu trú hoặc hủy booking. 

**Luồng chính (Main Flow):** 

1. Đối với booking đặt cọc qua chuyển khoản đang chờxác nhận: nhân viên kiểm tra thông tin thanh toán và chọn “Xác nhận thanh toán”. 

2. Hệthống cập nhật trạng thái thanh toán và booking theo kết quảxác nhận. 

3. Khi khách yêu cầu thay đổi ngày Check-in/Check-out: 

   - (a) Nhân viên chọn chức năng “Đổi lịch”. 

   - (b) Nhập ngày Check-in/Check-out mới. 

   - (c) Hệthống kiểm tra sốlượng phòng còn khảdụng. 

4. Nếu còn phòng: 

   - Cập nhật ngày lưu trú mới. 

   - Cập nhật lại tồn kho. 

   - Tính lại giá nếu phát sinh chênh lệch. 

5 

5. Nếu không còn phòng: hệthống thông báo không đủphòng cho khoảng thời gian mới. 

6. Khi khách yêu cầu hủy booking: 

   - (a) Nhân viên chọn “Hủy phòng”. 

   - (b) Nhập hoặc lựa chọn lý do hủy. 

   - (c) Hệthống kiểm tra chính sách hủy. 

   - (d) Tính phí hủy và sốtiền hoàn trảnếu có. 

   - (e) Cập nhật booking thành trạng thái “CANCELLED”. 

   - (f) Hoàn trảsốlượng phòng vềinventory. 

#### **3.1.3 Quản lý Phòng trống & Khóa bán tạm thời** 

**Mô tả:** Cho phép nhân viên theo dõi sốlượng phòng và tạm thời khóa phòng thuộc phân khu/tòa nhà được phân công nhằm hạn chếtình trạng Overbooking hoặc bán phòng đang bảo trì. 

#### **Luồng chính (Main Flow):** 

1. Nhân viên truy cập màn hình “Lịch phòng”. 

2. Hệthống xác định phân khu/tòa nhà được phân công và tựđộng lọc dữliệu theo phạm vi đó. 

3. Hệthống hiển thịlịch theo dạng Grid Calendar: 

   - Cột là các ngày. 

   - Dòng là các loại phòng. 

   - Mỗi ô hiển thịsốlượng phòng còn trống, đã đặt hoặc đang bịkhóa. 

4. Khi cần đóng bán phòng: 

   - (a) Nhân viên chọn phân khu/tòa nhà. 

   - (b) Chọn loại phòng hoặc phòng cần khóa. 

   - (c) Chọn ngày cần khóa. 

   - (d) Nhập sốlượng phòng và lý do khóa. 

   - (e) Chọn “Xác nhận khóa”. 

5. Hệthống cập nhật sốlượng phòng khảdụng trên website và ghi nhận trạng thái khóa phòng. 

6. Khi phòng được mởbán trởlại, nhân viên chọn “Mởphòng” và hệthống hoàn trảsốlượng phòng vào inventory. 

6 

#### **3.1.4 Tiếp nhận & Phản hồi Yêu cầu đặc biệt** 

**Mô tả:** Cho phép nhân viên xem xét, xửlý và phản hồi các yêu cầu đặc biệt của khách hàng trước khi khách đến lưu trú. 

**Luồng chính (Main Flow):** 

1. Nhân viên truy cập màn hình chi tiết booking. 

2. Hệthống hiển thịnội dung yêu cầu đặc biệt và trạng thái: _Chờxửlý, Đã chấp thuận, Từ chối_ . 

3. Nhân viên kiểm tra khảnăng đáp ứng thực tế: 

   - Nếu đáp ứng được: chọn “Đã chấp thuận”. 

   - Nếu không đáp ứng được: chọn “Từchối” và nhập lý do. 

4. Nhân viên chọn “Lưu phản hồi”. 

5. Hệthống cập nhật trạng thái yêu cầu vào booking và gửi thông báo phản hồi đến khách hàng. 

7 

### **3.2 Đặc tảAdmin** 

Bảng 2: Các chức năng của <u>quản</u> trị viên 

|**Tên chức năng**|**Mô tảtóm tắt**|**Input**|**Output**|
|---|---|---|---|
|Kếthừa quyền<br>hạn Staff|Sửdụng toàn bộchức<br>năng của nhân viên|Các module<br>Booking, Room<br>Calendar, Room<br>Management, ...|Có thểxửlý booking và<br>quản lý phòng|
|Quản lý Phân<br>khu / Tòa nhà|Khởi tạo và quản lý các<br>phân khu/tòa nhà trong<br>khách sạn|Tên khu, mô tả, số<br>tầng, hình ảnh,<br>trạng thái|Danh<br>sách<br>phân<br>khu<br>được cập nhật trong hệ<br>thống|
|Quản lý Loại<br>phòng & Tiện<br>ích|Quản<br>lý<br>loại<br>phòng<br>thuộc<br>từng<br>phân<br>khu/tòa nhà|Phân khu, tên loại<br>phòng, diện tích,<br>sức chứa, ảnh, tiện<br>ích|Thông tin loại phòng<br>được<br>cập<br>nhật<br>trên<br>website|
|Cấu hình Bảng<br>giá & Phụthu|Cài đặt giá phòng theo<br>thời gian và các khoản<br>phụthu|Khoảng ngày, mức<br>giá, loại phòng,<br>phụthu|Giá được áp dụng tự<br>động khi khách tìm kiếm|
|Quản lý Mã<br>giảm giá<br>(Voucher)|Tạo và phát hành mã<br>khuyến mãi|Mã code, loại<br>giảm, giá trị, thời<br>hạn, sốlượt|Voucher được áp dụng<br>khi đặt phòng|
|Cấu hình Chính<br>sách hoàn/hủy|Thiết<br>lập<br>chính<br>sách<br>hủy<br>booking<br>và<br>hoàn<br>tiền/cọc|Mốc thời gian, tỷ<br>lệphạt, tỷlệhoàn<br>tiền|Chính<br>sách<br>được<br>áp<br>dụng<br>khi<br>khách<br>hoặc<br>Staff hủy booking|
|Quản lý Tài<br>khoản nhân viên|Cấp quyền và phân công<br>nhân<br>viên<br>theo<br>phân<br>khu/tòa nhà|Họtên, email, mật<br>khẩu, vai trò, phân<br>khu phụtrách|Tài khoản Staff được tạo<br>và gán phạm vi quản lý|
|Báo cáo &<br>Thống kê kinh<br>doanh|Theo dõi doanh thu và<br>tỷlệlấp đầy theo từng<br>phân khu|Khoảng thời gian,<br>phân khu/tòa nhà|Báo cáo doanh thu, tỷlệ<br>lấp đầy và tỷlệhủy|



### **3.3 Đặc tảchi tiết** 

#### **3.3.1 Quản lý Phân khu / Tòa nhà** 

**Mô tả:** Cho phép Admin khởi tạo, quản lý và cập nhật các phân khu/tòa nhà thuộc phạm vi khách sạn. 

**Luồng chính (Main Flow):** 

1. Admin truy cập màn hình “Quản lý Phân khu / Tòa nhà”. 

2. Admin chọn “Thêm mới” hoặc “Chỉnh sửa” một phân khu hoặc tòa nhà đã tồn tại. 

3. Nhập thông tin: 

8 

   - Tên phân khu/tòa nhà. 

   - Mô tảvịtrí. 

   - Tiện ích riêng. 

   - Sốlượng tầng. 

   - Hình ảnh khuôn viên. 

   - Trạng thái hoạt động. 

4. Admin chọn “Lưu thông tin”. 

5. Hệthống cập nhật dữliệu vào CSDL. 

6. Phân khu/tòa nhà mới có thểđược sửdụng để: 

   - Gán loại phòng. 

   - Gán nhân viên phụtrách. 

   - Phân loại dữliệu booking. 

   - Lọc dữliệu tìm kiếm. 

   - Tổng hợp báo cáo kinh doanh. 

#### **3.3.2 Quản lý Loại phòng & Tiện ích** 

**Mô tả:** Cho phép Admin thiết lập các loại phòng thuộc từng phân khu/tòa nhà và cấu hình thông tin hiển thịtrên website. 

**Luồng chính (Main Flow):** 

1. Admin truy cập màn hình “Quản lý Loại phòng”. 

2. Admin bắt buộc chọn phân khu/tòa nhà trước khi tạo loại phòng. 

3. Admin chọn “Thêm mới” hoặc “Chỉnh sửa” loại phòng. 

4. Nhập thông tin: 

   - Tên loại phòng: Standard, Deluxe, Suite, ... 

   - Sức chứa người lớn/trẻem. 

   - Diện tích. 

   - Loại giường. 

   - Tiện ích. 

   - Hình ảnh. 

5. Admin chọn “Lưu thay đổi”. 

6. Hệthống cập nhật dữliệu và hiển thịloại phòng tương ứng với phân khu/tòa nhà trên website. 

9 

#### **3.3.3 Cấu hình Bảng giá & Phụthu** 

**Mô tả:** Cho phép Admin điều chỉnh giá phòng theo từng loại phòng, phân khu/tòa nhà và khoảng thời gian áp dụng. 

#### **Luồng chính (Main Flow):** 

1. Admin truy cập màn hình “Cấu hình giá”. 

2. Chọn phân khu/tòa nhà và loại phòng cần cấu hình. 

3. Chọn khoảng thời gian áp dụng. 

4. Nhập mức giá mới. 

5. Cấu hình các khoản phụthu nếu có: 

   - Phụthu thêm người lớn. 

   - Phụthu trẻem. 

   - Phụthu nhận phòng sớm. 

   - Phụthu trảphòng muộn. 

   - Phụthu ngày lễhoặc mùa cao điểm. 

6. Chọn “Áp dụng giá”. 

7. Hệthống sửdụng biểu giá tương ứng khi khách tìm kiếm và đặt phòng. 

#### **3.3.4 Quản lý Mã giảm giá (Voucher)** 

- **Mô tả:** Cho phép Admin tạo và quản lý các chương trình khuyến mãi áp dụng cho booking. **Luồng chính (Main Flow):** 

   1. Admin truy cập màn hình “Khuyến mại”. 

   2. Chọn “Tạo mã mới”. 

   3. Thiết lập: 

      - Mã voucher. 

      - Loại giảm giá. 

      - Giá trịgiảm. 

      - Giá trịđơn hàng tối thiểu. 

      - Thời gian bắt đầu và kết thúc. 

      - Sốlượt sửdụng tối đa. 

   4. Admin chọn “Kích hoạt”. 

   5. Hệthống kiểm tra tính hợp lệcủa voucher và cho phép khách hàng sửdụng voucher khi đặt phòng. 

10 

#### **3.3.5 Cấu hình Chính sách hoàn/hủy** 

- **Mô tả:** Cho phép Admin thiết lập chính sách hủy booking, phí phạt và sốtiền được hoàn trả. **Luồng chính (Main Flow):** 

   1. Admin truy cập “Cài đặt chính sách”. 

   2. Chọn phạm vi áp dụng: 

      - Toàn hệthống. 

      - Phân khu/tòa nhà. 

      - Loại phòng hoặc gói giá. 

   3. Thiết lập mốc thời gian và tỷlệhoàn/phạt. 

   4. Ví dụ: 

      - Hủy trước 7 ngày: hoàn 100%. 

      - Hủy trước 3 ngày: phạt 50% tiền cọc. 

      - Hủy trong vòng 24 giờ: mất 100% tiền cọc. 

   5. Admin chọn “Lưu chính sách”. 

   6. Hệthống sửdụng chính sách làm căn cứtính phí hủy và sốtiền hoàn trảkhi booking được hủy. 

#### **3.3.6 Quản lý Tài khoản nhân viên** 

**Mô tả:** Cho phép Admin quản lý tài khoản Staff và phân công phạm vi quản lý theo phân khu/tòa nhà. 

**Luồng chính (Main Flow):** 

1. Admin truy cập màn hình “Người dùng nội bộ”. 

2. Chọn “Thêm nhân viên”. 

3. Nhập thông tin: 

   - Họtên. 

   - Email công việc. 

   - Mật khẩu ban đầu. 

   - Vai trò. 

   - Phân khu/tòa nhà phụtrách. 

4. Admin có thểgán một hoặc nhiều phân khu/tòa nhà cho một tài khoản Staff. 

5. Khi Staff đăng nhập, hệthống tựđộng xác định phạm vi dữliệu dựa trên phân khu/tòa nhà được phân công. 

11 

6. Khi cần thu hồi quyền, Admin có thểkhóa tài khoản hoặc thay đổi phạm vi phân công. 

7. Hệthống vô hiệu hóa quyền truy cập tương ứng. 

#### **3.3.7 Báo cáo & Thống kê kinh doanh** 

**Mô tả:** Cho phép Admin theo dõi tình hình kinh doanh toàn hệthống hoặc theo từng phân khu/tòa nhà. 

**Luồng chính (Main Flow):** 

1. Admin truy cập màn hình “Dashboard / Báo cáo”. 

2. Lựa chọn khoảng thời gian: 

   - Hôm nay. 

   - 7 ngày qua. 

   - Tháng này. 

   - Khoảng ngày tùy chọn. 

3. Admin có thểchọn phạm vi báo cáo: 

   - Toàn bộkhách sạn. 

   - Một phân khu/tòa nhà cụthể. 

4. Hệthống tổng hợp và hiển thị: 

   - **Tổng doanh thu thực nhận:** sốtiền đã cọc và sốtiền đã thanh toán. 

   - **Tỷlệlấp đầy phòng (Occupancy Rate):** tỷlệphòng đã được đặt trên tổng số phòng được mởbán. 

   - **Tỷlệhủy phòng:** sốbooking bịhủy trên tổng sốbooking phát sinh. 

   - **Doanh thu theo phân khu/tòa nhà:** tổng doanh thu của từng khu vực trong khoảng thời gian được chọn. 

### **3.4 Đặc tảchức năng phân hệkhách hàng** 

#### **3.4.1 Authentication & Account Management** 

UC-01: Đăng ký tài khoản (Register) 

**Mô tả:** Cho phép khách hàng mới tạo tài khoản đểsửdụng các chức năng cá nhân hóa và đặt phòng trên hệthống. 

**Tác nhân:** Khách vãng lai. **Đầu vào:** 

- Họtên. 

- Email. 

12 

- Sốđiện thoại. 

- Mật khẩu. 

- Xác nhận mật khẩu. 

- Hoặc đăng ký nhanh bằng Google OAuth2. 

#### **Luồng xửlý chính:** 

1. Khách hàng nhập thông tin đăng ký hoặc lựa chọn đăng ký bằng Google OAuth2. 

2. Hệthống kiểm tra tính hợp lệcủa dữliệu: 

   - Định dạng Email. 

   - Định dạng Sốđiện thoại. 

   - Độmạnh của Mật khẩu. 

   - Tính duy nhất của Email và Sốđiện thoại. 

3. Đối với đăng ký bằng Email/Sốđiện thoại, hệthống gửi mã OTP hoặc liên kết kích hoạt. 

4. Khách hàng thực hiện xác thực trong thời gian quy định. 

5. Nếu xác thực thành công: 

   - Hệthống hash mật khẩu trước khi lưu trữ. 

   - Tạo tài khoản với Role = **CUSTOMER** . 

   - Lưu thông tin tài khoản vào cơ sởdữliệu. 

6. Hệthống thông báo đăng ký thành công và chuyển khách hàng đến trang đăng nhập. 

#### **Quy tắc nghiệp vụ:** 

- Email và Sốđiện thoại phải là duy nhất trong hệthống. 

- Mật khẩu tối thiểu 8 ký tự, bao gồm ít nhất: 

   - 1 chữhoa. 

   - 1 chữsố. 

   - 1 ký tựđặc biệt. 

- OTP hoặc Link kích hoạt có hiệu lực trong 5 phút. 

- Mật khẩu không được lưu dưới dạng văn bản thuần túy. 

- Nếu Email Google đã tồn tại, hệthống yêu cầu xác minh tài khoản hiện tại trước khi thực hiện Account Linking. 

#### **Ngoại lệ:** 

13 

- Email hoặc Sốđiện thoại đã tồn tại _→_ thông báo lỗi. 

- OTP hết hạn _→_ yêu cầu gửi lại OTP. 

- OTP không hợp lệ _→_ yêu cầu nhập lại. 

- Thông tin đăng ký không hợp lệ _→_ không tạo tài khoản. 

UC-02: Đăng nhập (Login) 

**Mô tả:** Xác thực khách hàng đểtruy cập các chức năng cá nhân hóa. **Tác nhân:** Khách hàng. 

**Đầu vào:** 

- Email hoặc Sốđiện thoại. 

- Mật khẩu. 

- Tùy chọn Remember Me. 

- Hoặc đăng nhập bằng Google OAuth2. 

#### **Luồng xửlý chính:** 

1. Khách hàng nhập thông tin đăng nhập. 

2. Hệthống kiểm tra tài khoản. 

3. Hệthống xác thực mật khẩu hoặc thực hiện OAuth2 với Google. 

4. Nếu xác thực thành công: 

   - Tạo phiên đăng nhập. 

   - Cấp Access Token và Refresh Token hoặc Session. 

   - Xác định quyền truy cập của tài khoản. 

5. Chuyển khách hàng vềtrang chủhoặc trang trước đó. 

#### **Quy tắc nghiệp vụ:** 

- Nếu nhập sai mật khẩu quá 5 lần liên tiếp, tài khoản bịkhóa tạm thời trong 15 phút. 

- Access Token có thời gian sống ngắn. 

- Refresh Token được sửdụng đểcấp Access Token mới khi cần. 

- Khách hàng có thểsửdụng chức năng “Quên mật khẩu”. 

#### **Quên mật khẩu:** 

1. Khách hàng nhập Email đã đăng ký. 

2. Hệthống gửi liên kết hoặc token đặt lại mật khẩu. 

14 

3. Token có hiệu lực trong 15 phút. 

4. Khách hàng tạo mật khẩu mới. 

5. Hệthống vô hiệu hóa token sau khi sửdụng thành công. 

UC-03: Quản lý thông tin cá nhân (Manage Profile) 

**Mô tả:** Cho phép khách hàng xem và cập nhật thông tin tài khoản cá nhân. **Tác nhân:** Khách hàng. 

**Thông tin quản lý:** 

- Họtên. 

- Email. 

- Sốđiện thoại. 

- Ảnh đại diện. 

- Mật khẩu. 

- Tài khoản Google đã liên kết. 

#### **Quy tắc nghiệp vụ:** 

- Chỉkhách hàng đã đăng nhập mới được sửdụng chức năng này. 

- Email và Sốđiện thoại sau khi thay đổi phải được kiểm tra tính duy nhất. 

- Thay đổi thông tin nhạy cảm có thểyêu cầu xác thực lại. 

#### **3.4.2 Hotel Discovery** 

UC-04: Tìm kiếm khách sạn (Search Hotels) 

**Mục tiêu:** Cho phép khách vãng lai hoặc khách hàng tìm kiếm các khách sạn có phòng phù hợp với nhu cầu lưu trú. 

**Tác nhân:** Khách vãng lai, Khách hàng. 

**Dữliệu đầu vào:** 

1. Khu vực: Thành phố, Quận/Huyện hoặc địa điểm du lịch. 

2. Ngày Check-in. 

3. Ngày Check-out. 

4. Sốngười lớn _≥_ 1. 

5. Sốtrẻem _≥_ 0. 

6. Sốphòng _≥_ 1. 

**Luồng xửlý chính:** 

15 

1. Người dùng nhập các tham sốtìm kiếm. 

2. Hệthống kiểm tra: 

   - Check-in _≥_ ngày hiện tại. 

   - Check-out _>_ Check-in. 

   - Sốngười lớn _≥_ 1. 

   - Sốphòng _≥_ 1. 

3. Hệthống tìm các khách sạn thuộc khu vực được yêu cầu. 

4. Hệthống kiểm tra khảnăng đáp ứng phòng trong toàn bộkhoảng `[Check-in, Check-out)` . 

5. Hệthống loại bỏcác khách sạn không đáp ứng: 

   - Sốlượng phòng yêu cầu. 

   - Sức chứa theo chính sách của loại phòng. 

6. Với mỗi khách sạn phù hợp, hệthống xác định mức giá đại diện thấp nhất của các loại phòng phù hợp. 

7. Hệthống trảvềdanh sách khách sạn. 

#### **Dữliệu đầu ra:** 

Mỗi Hotel Card bao gồm: 

- Tên khách sạn. 

- Hạng sao. 

- Địa điểm. 

- Điểm đánh giá. 

- Loại phòng đại diện. 

- Giá thấp nhất/đêm. 

#### **Ví dụ:** 

```
HotelA
Standard-500.000đ/đêm
```

```
HotelB
Standard-700.000đ/đêm
```

```
HotelC
Standard-1.000.000đ/đêm
```

**Ngoại lệ:** 

16 

- Không tìm thấy khách sạn phù hợp _→_ hiển thịthông báo và đềxuất thay đổi ngày, khu vực hoặc sốkhách. 

- Ngày không hợp lệ _→_ yêu cầu nhập lại. 

- Sốlượng phòng không hợp lệ _→_ yêu cầu nhập lại. 

UC-05: Bộlọc và Sắp xếp kết quả(Filter & Sort) 

**Mục tiêu:** Cho phép người dùng thu hẹp và sắp xếp danh sách khách sạn sau khi tìm kiếm. **Tác nhân:** Khách vãng lai, Khách hàng. 

**Phạm vi:** Áp dụng trên toàn bộtập kết quảtìm kiếm. **Tiêu chí lọc:** 

1. Khoảng giá/đêm. 

2. Hạng sao: 1–5 sao. 

3. Điểm đánh giá trung bình. 

4. Loại hình lưu trú: 

   - Hotel. 

   - Resort. 

   - Apartment. 

   - Homestay. 

   - Villa. 

5. Tiện ích: 

   - Hồbơi. 

   - Bữa sáng miễn phí. 

   - Wi-Fi. 

   - Chỗđỗxe. 

   - Gần biển. 

   - Cho phép thú cưng. 

6. Chính sách: 

   - Hủy miễn phí. 

   - Thanh toán tại khách sạn. 

**Tiêu chí sắp xếp:** 

1. Giá tăng dần. 

2. Giá giảm dần. 

17 

3. Điểm đánh giá cao nhất. 

4. Độphổbiến. **Luồng xửlý:** 

1. Người dùng lựa chọn một hoặc nhiều bộlọc. 

2. Hệthống cập nhật danh sách sau khi thay đổi tiêu chí. 

3. Hệthống cập nhật sốlượng kết quả. 

4. Người dùng có thểkết hợp nhiều tiêu chí lọc. 

UC-06: Xem chi tiết khách sạn (View Hotel Details) **Mô tả:** Hiển thịthông tin chi tiết của khách sạn được lựa chọn. **Tác nhân:** Khách vãng lai, Khách hàng. **Thông tin hiển thị:** 

- Tên khách sạn. 

- Hạng sao. 

- Địa chỉ. 

- Vịtrí trên bản đồ. 

- Bộsưu tập hình ảnh/video. 

- Mô tảtổng quan. 

- Tiện nghi chung. 

- Chính sách chung. 

- GiờCheck-in/Check-out. 

- Chính sách trẻem. 

- Chính sách thú cưng. 

- Chính sách hủy. 

- Điểm đánh giá trung bình. 

- Tổng sốlượt đánh giá. 

- Giá phòng tham khảo. 

UC-07: Xem danh sách phòng (View Room Types) 

**Mô tả:** Hiển thịcác loại phòng thuộc khách sạn theo ngày lưu trú đã chọn. **Tác nhân:** Khách vãng lai, Khách hàng. **Thông tin hiển thị:** 

18 

- Tên loại phòng. 

- Diện tích. 

- Loại giường. 

- Sức chứa tối đa. 

- Sốlượng phòng còn khảdụng. 

- Hình ảnh phòng. 

- Tiện ích phòng. 

- Chính sách giá. 

- Ăn sáng hoặc không ăn sáng. 

- Chính sách hủy. 

- Đơn giá/đêm. 

- Tổng giá tạm tính theo sốđêm. 

- Thuế/phí nếu áp dụng. 

#### **Quy tắc nghiệp vụ:** 

- Giá và sốlượng phòng phải được tính dựa trên ngày Check-in/Check-out hiện tại. 

- Chính sách sức chứa phải tuân theo cấu hình của từng loại phòng và chính sách trẻem của khách sạn. 

UC-08: Kiểm tra phòng trống (Check Availability) 

**Mục tiêu:** Kiểm tra lại khảnăng đáp ứng phòng tại thời điểm khách yêu cầu đặt phòng nhằm hạn chếtình trạng overbooking. 

**Tác nhân:** Khách vãng lai, Khách hàng. 

**Luồng xửlý:** 

1. Hệthống kiểm tra tồn kho trong khoảng `[Check-in, Check-out)` . 

2. Kiểm tra sốlượng phòng khảdụng. 

3. Kiểm tra sức chứa theo loại phòng và sốlượng khách. 

4. Nếu đáp ứng đủ: 

   - Cho phép chuyển sang bước Đặt phòng. 

5. Nếu không đáp ứng: 

   - Hiển thịcảnh báo. 

19 

- Đềxuất loại phòng khác hoặc ngày khác. 

#### **Ngoại lệ:** 

Nếu phòng đã được khách khác giữhoặc đặt trong thời gian khách đang thao tác, hệthống phải kiểm tra lại tồn kho tại thời điểm tạo booking và không cho phép vượt quá sốlượng phòng thực tế. 

#### **3.4.3 Booking & Payment** 

UC-09: Đặt phòng (Booking Creation) 

**Mô tả:** Thu thập thông tin khách lưu trú và tạo đơn đặt phòng. 

**Tác nhân:** Khách hàng. 

**Đầu vào:** 

- Họtên người đặt. 

- Sốđiện thoại. 

- Email. 

- Tên khách nhận phòng. 

- Loại phòng. 

- Sốlượng phòng. 

- Yêu cầu đặc biệt: 

   - Tầng cao. 

   - Không hút thuốc. 

   - Check-in muộn. 

- Mã giảm giá/Voucher. 

- Phương thức thanh toán: 

   - Đặt cọc. 

   - Thanh toán bằng tiền mặt khi nhận phòng. 

**Luồng xửlý:** 

1. Hệthống kiểm tra lại tình trạng phòng. 

2. Thực hiện giữchỗtạm thời (Hold Inventory). 

3. Thời gian giữchỗmặc định là 15 phút. 

4. Tạo `expires_at = NOW() + 15 phút` . 

5. Kiểm tra và áp dụng Voucher nếu hợp lệ. 

20 

6. Tính tổng tiền: 

Tổng tiền = (Đơn giá _×_ Sốđêm _×_ Sốphòng) + Thuế/Phí _−_ Giảm giá _._ 

7. Khách hàng lựa chọn phương thức thanh toán. 

8. Nếu chọn **Đặt cọc** : 

   - Booking _→_ `PENDING_PAYMENT` . 

   - Chuyển sang bước thanh toán tiền cọc. 

9. Nếu chọn **Tiền mặt khi nhận phòng** : 

   - Booking _→_ `CONFIRMED` . 

   - Payment Status _→_ `UNPAID` . 

   - Không yêu cầu thanh toán trực tuyến. 

10. Hệthống gửi thông tin xác nhận đặt phòng cho khách hàng. 

#### **Ngoại lệ:** 

- Phòng không còn đủtại thời điểm giữchỗ _→_ không tạo booking. 

- Voucher không hợp lệ _→_ thông báo và cho phép khách tiếp tục không sửdụng voucher. 

- Thông tin khách không hợp lệ _→_ yêu cầu nhập lại. 

UC-10: Thanh toán (Payment) 

**Mô tả:** Xửlý khoản thanh toán của khách hàng theo phương thức được lựa chọn khi đặt phòng. 

**Tác nhân:** Khách hàng, Hotel Staff. 

**Phương thức thanh toán:** 

- **Đặt cọc:** Khách hàng thanh toán trước một khoản tiền theo quy định của khách sạn. 

- **Tiền mặt khi nhận phòng:** Khách hàng thanh toán toàn bộsốtiền còn lại tại thời điểm Check-in. 

#### **Luồng xửlý đối với đặt cọc:** 

1. Khách hàng chọn phương thức “Đặt cọc”. 

2. Hệthống tính tổng giá trịbooking. 

3. Hệthống xác định sốtiền đặt cọc theo chính sách của khách sạn. 

4. Booking được tạo với trạng thái `PENDING_PAYMENT` . 

5. Khách hàng thực hiện thanh toán tiền cọc. 

6. Hệthống xác nhận kết quảthanh toán. 

21 

7. Nếu thanh toán thành công: 

   - Payment Status _→_ `PARTIALLY_PAID` . 

   - Booking Status _→_ `CONFIRMED` . 

   - Inventory chuyển từ `HELD` sang `BOOKED` . 

#### **Luồng xửlý đối với tiền mặt khi nhận phòng:** 

1. Khách hàng chọn phương thức “Tiền mặt khi nhận phòng”. 

2. Hệthống tạo booking. 

3. Booking Status _→_ `CONFIRMED` . 

4. Payment Status _→_ `UNPAID` . 

5. Hệthống gửi thông tin xác nhận đặt phòng. 

6. Khi khách hàng đến nhận phòng, Hotel Staff thực hiện Check-in. 

7. Khách hàng thanh toán bằng tiền mặt. 

8. Payment Status _→_ `PAID` . 

#### **Trạng thái Booking:** 

- `PENDING_PAYMENT` . 

- `CONFIRMED` . 

- `CHECKED_IN` . 

- `COMPLETED` . 

- `CANCELLED` . 

- `EXPIRED` . 

- `NO_SHOW` . 

#### **Trạng thái Payment:** 

- `UNPAID` . 

- `PARTIALLY_PAID` . 

- `PAID` . 

- `FAILED` . 

- `REFUND_PENDING` . 

- `REFUNDED` . 

22 

#### **Phương thức Payment:** 

- `DEPOSIT` . 

- `CASH` . 

UC-11: Xem lịch sửđặt phòng (View Booking History) 

**Mô tả:** Cho phép khách hàng xem và quản lý các đơn đặt phòng của chính mình. **Tác nhân:** Khách hàng. 

#### **Phân loại:** 

- Upcoming. 

- Completed. 

- Cancelled. 

- Expired. 

#### **Thông tin hiển thị:** 

- Booking Code. 

- Tên khách sạn. 

- Địa chỉ. 

- Loại phòng. 

- Sốlượng phòng. 

- Check-in. 

- Check-out. 

- Trạng thái Booking. 

- Mã QR Check-in nếu có. 

- Chi tiết thanh toán. 

- Chính sách hủy. 

#### **Quy tắc nghiệp vụ:** 

- Khách hàng chỉđược xem các booking thuộc tài khoản của mình. 

- Không được phép truy cập booking của tài khoản khác. 

UC-12: Hủy đặt phòng (Cancel Booking) 

**Mô tả:** Cho phép khách hàng hủy booking theo chính sách của khách sạn hoặc gói giá. **Tác nhân:** Khách hàng. 

**Luồng xửlý:** 

23 

1. Khách hàng chọn booking cần hủy. 

2. Hệthống kiểm tra trạng thái booking. 

3. Hệthống kiểm tra chính sách hủy. 

4. Xác định phí phạt nếu có. 

5. Tính sốtiền được hoàn. 

6. Khách hàng xác nhận hủy. 

7. Booking chuyển sang `CANCELLED` . 

8. Giải phóng sốphòng vềinventory. 

9. Nếu booking đã đặt cọc và cần hoàn tiền: 

   - Payment _→_ `REFUND_PENDING` . 

   - Thực hiện quy trình hoàn tiền. 

10. Khi hoàn tiền thành công: 

   - Payment _→_ `REFUNDED` . 

#### **Quy tắc nghiệp vụ:** 

- Booking đã `CHECKED_IN` hoặc `COMPLETED` không được hủy theo quy trình thông thường. 

- Booking `NON_REFUNDABLE` không được hoàn tiền hoặc chỉđược hoàn theo chính sách được cấu hình. 

- Booking đã `CANCELLED` không thểhủy lại. 

- Phí hủy phụthuộc vào thời điểm hủy và chính sách của gói giá. 

- Nếu booking thanh toán bằng tiền mặt và chưa thanh toán, hệthống không thực hiện hoàn tiền. 

- Nếu booking đã đặt cọc, khoản tiền được hoàn phụthuộc vào chính sách hủy của khách sạn. 

#### **3.4.4 Review & Rating** 

- UC-13: Đánh giá & Nhận xét (Reviews & Ratings) **Mô tả:** Cho phép khách hàng đánh giá khách sạn sau khi hoàn thành kỳlưu trú thực tế. **Tác nhân:** Khách hàng. 

   - **Đầu vào:** 

   - Điểm tổng thể: 1–5 sao. 

24 

- Điểm theo tiêu chí: 

   - Sạch sẽ. 

   - Vịtrí. 

   - Dịch vụ. 

   - Tiện nghi. 

   - Đáng giá tiền. 

- Nội dung nhận xét. 

- Hình ảnh thực tế. 

**Luồng xửlý:** 

1. Khách hàng mởbooking có trạng thái `COMPLETED` . 

2. Chọn chức năng “Viết đánh giá”. 

3. Nhập điểm sốvà nội dung. 

4. Gửi đánh giá. 

5. Hệthống kiểm tra điều kiện đánh giá. 

6. Hệthống kiểm duyệt nội dung. 

7. Nếu hợp lệ: 

   - Review _→_ `APPROVED` . 

   - Hiển thịđánh giá. 

   - Cập nhật Average Rating. 

   - Cập nhật Review Count. 

8. Nếu không hợp lệ: 

   - Review _→_ `REJECTED` . 

   - Không hiển thịcông khai. 

#### **Quy tắc nghiệp vụ:** 

- Chỉbooking có trạng thái `COMPLETED` mới được đánh giá. 

- Mỗi booking chỉđược đánh giá một lần. 

- Khách hàng chỉđược đánh giá booking thuộc tài khoản của mình. 

- Review có thểđược chỉnh sửa trong vòng 30 ngày kểtừthời điểm gửi. 

- Sau khi đánh giá hợp lệ, hệthống cập nhật lại điểm trung bình của khách sạn. 

- Nội dung vi phạm quy tắc hệthống có thểbịtừchối hoặc ẩn. 

25 

#### **3.4.5 Optional Feature** 

- UC-14: Quản lý danh sách yêu thích (Wishlist) 

   - **Mô tả:** Cho phép khách hàng lưu các khách sạn quan tâm đểxem lại sau. **Tác nhân:** Khách hàng. 

   - **Luồng xửlý:** 

   1. Khách hàng chọn biểu tượng yêu thích trên Hotel Card hoặc Hotel Detail. 

   2. Hệthống thêm khách sạn vào danh sách yêu thích. 

   3. Khách hàng có thểxem danh sách yêu thích. 

   4. Khách hàng có thểxóa khách sạn khỏi danh sách. 

**Quy tắc nghiệp vụ:** 

- Chỉkhách hàng đã đăng nhập mới được sửdụng Wishlist. 

- Một khách sạn chỉxuất hiện một lần trong Wishlist của một khách hàng. 

Business Rules chung 

BR-01: Quy tắc ngày lưu trú 

- Check-in _≥_ ngày hiện tại. 

- Check-out _>_ Check-in. 

- Khoảng thời gian lưu trú được tính theo: 

[Check-in _,_ Check-out) 

- Ngày Check-out không được tính là một đêm lưu trú. 

BR-02: Quy tắc tồn kho 

- Không được phép đểsốphòng khảdụng nhỏhơn 0. 

- Không được phép xác nhận booking vượt quá sốphòng thực tế. 

- Inventory phải được kiểm tra lại tại thời điểm tạo booking. 

- Phòng được giữtạm thời phải có thời gian hết hạn. 

BR-03: Quy tắc Hold Inventory 

- Thời gian giữchỗmặc định: 15 phút. 

- Khi thanh toán đặt cọc thành công, `HELD` chuyển thành `BOOKED` . 

- Khi hết hạn thanh toán, `HELD` được giải phóng. 

26 

#### BR-04: Quy tắc thanh toán 

- Mỗi giao dịch thanh toán phải có mã giao dịch duy nhất. 

- Không được ghi nhận thanh toán thành công nhiều lần cho cùng một giao dịch. 

- Trạng thái thanh toán phải được cập nhật dựa trên kết quảxác thực của hệthống thanh toán. 

- Đối với thanh toán tiền mặt, Hotel Staff phải xác nhận khoản tiền đã nhận tại thời điểm Check-in. 

BR-05: Quy tắc Booking 

Mỗi booking phải có: 

- Booking Code duy nhất. 

- Customer ID. 

- Hotel ID. 

- Room Type ID. 

- Check-in. 

- Check-out. 

- Sốlượng phòng. 

- Tổng tiền. 

- Booking Status. 

- Payment Method. 

- Payment Status. 

BR-06: Quy tắc Review 

- Mỗi booking chỉđược review một lần. 

- Chỉbooking `COMPLETED` mới được review. 

- Review phải thuộc chính khách hàng đã thực hiện booking. 

BR-07: Quy tắc Authorization Khách hàng chỉđược phép: 

- Xem thông tin tài khoản của chính mình. 

- Cập nhật thông tin tài khoản của chính mình. 

27 

- Xem booking của chính mình. 

- Hủy booking của chính mình. 

- Đánh giá booking của chính mình. 

- Quản lý Wishlist của chính mình. 

Hệthống phải từchối các yêu cầu truy cập dữliệu thuộc tài khoản khách hàng khác. BR-08: Quy tắc bảo mật 

- Mật khẩu phải được hash trước khi lưu. 

- Không lưu mật khẩu dạng plain text. 

- Token xác thực phải có thời gian hết hạn. 

- Refresh Token phải được bảo vệkhỏi truy cập trái phép. 

- Các API liên quan đến thông tin cá nhân và booking phải yêu cầu xác thực. 

- Các thao tác nhạy cảm có thểyêu cầu xác thực lại. 

## **4 Sơ đồUse Case** 

### **4.1 Danh sách Actor** 

Bảng 3: Danh sách Actor 

|**Actor**|**Vai trò**|**Mô tả**|
|---|---|---|
|Guest|Khách vãng lai|Tìm kiếm khách sạn, xem thông tin khách sạn,<br>xem phòng và kiểm tra tình trạng phòng mà<br>không cần đăng nhập.|
|Customer|Khách hàng|Quản lý thông tin cá nhân, đặt phòng, thanh<br>toán, quản lý booking, hủy booking và đánh giá<br>khách sạn.|
|Admin|Quản trịhệthống|Quản lý dữliệu hệthống, khách sạn, phòng, loại<br>phòng, booking, tài khoản và đánh giá.|
|Hotel Staff|Nhân viên khách sạn|Quản lý phòng, xửlý booking, Check-in, Check-<br>out và các hoạt động vận hành khách sạn.|



28 



<!-- Start of picture text -->
cueing<br>os Lonan<br>Corns) fAYC caer,romsmapen<br>inn boot on sm" a 5<br>oes ccna spew oo. (lia tit c& koichsan)<br>Pens ON, (customesa, gaye Tuy le)<br>oe sine ooiitert,<br>i=er (tee inden san due phan ching),<br>$a YXeeoun booking ice sat<br>— Tease<br>H ‘(checki, check ut.)<br>(omen) oe<br><!-- End of picture text -->

Hình 2: Sơ đồUse Case phân hệkhách hàng 

### **4.2 Danh sách Use Case** 

#### **4.2.1 Customer** 

Bảng 4: Danh sách Use Case của Customer 

|**ID**|**Actor**|**Use Case**|**Mô tảngắn**|
|---|---|---|---|
|C01|Customer|Đăng ký tài khoản|Tạo tài khoản khách hàng|
|C02|Customer|Đăng nhập|Đăng nhập hệthống|
|C03|Customer|Tìm kiếm phòng|Tìm kiếm phòng theo tiêu chí như ngày<br>nhận/trả, sốkhách|
|C04|Customer|Xem thông tin phòng|Xem thông tin, giá, tiện nghi của phòng|
|C05|Customer|Kiểm tra phòng trống|Kiểm tra phòng còn khảdụng trong<br>khoảng thời gian yêu cầu|
|C06|Customer|Đặt phòng|Tạo booking cho phòng được chọn|
|C07|Customer|Thanh toán|Thanh toán cho booking|
|C08|Customer|Xem booking|Xem và quản lý các booking của bản thân|
|C09|Customer|Hủy booking|Hủybookingtheo chính sách của khách sạn|
|C10|Customer|Gửi đánh giá|Đánh giá phòng/dịch vụsau khi hoàn<br>thành lưu trú|



29 

#### **4.2.2 Admin** 

Bảng 5: Danh sách Use Case của Admin 

|**ID**|**Actor**|**Use Case**|**Mô tảngắn**|
|---|---|---|---|
|A01|Admin|Quản lý khách sạn|Quản lý thông tin của khách sạn|
|A02|Admin|Quản lý loại phòng|Quản lýloạiphòng, giá,sức chứa,tiện nghi|
|A03|Admin|Quản lý phòng|Quản lý các phòng thuộc khách sạn|
|A04|Admin|Quản lý booking|Quản lý booking trên hệthống|
|A05|Admin|Quản lý người dùng|Quản lý tài khoản người dùng|
|A06|Admin|Quản lý đánh giá|Quản lý/kiểm duyệt đánh giá|



#### **4.2.3 Hotel Staff** 

Bảng 6: Danh sách Use Case của Hotel Staff 

|**ID**|**Actor**|**Use Case**|**Mô tảngắn**|
|---|---|---|---|
|S01|Hotel Staff|Quản lý phòng|Cập nhật trạng thái và thông tin vận hành<br>của phòng|
|S02|Hotel Staff|Quản lý booking|Tiếp nhận, xác nhận, cập nhật và xửlý<br>booking|
|S03|Hotel Staff|Kiểm tra tình trạng<br>phòng|Kiểm tra tình trạng phòng phục vụviệc xử<br>lý booking|



## **5 Các yêu cầu phi chức năng** 

### **5.1 Security – Bảo mật** 

- Đăng ký, đăng nhập và đăng xuất tài khoản. 

- Phân quyền cơ bản giữa khách hàng và quản trịviên. 

- Mã hóa mật khẩu. 

- Kiểm tra dữliệu người dùng nhập vào. 

- Bảo vệcác chức năng quản trị. 

- Không lưu trực tiếp thông tin thẻngân hàng. 

- Ghi nhận các thao tác quan trọng như đặt và hủy phòng. 

30 

### **5.2 Performance – Hiệu năng** 

- Tối ưu tốc độtải trang. 

- Tối ưu chức năng tìm kiếm khách sạn và phòng. 

- Sửdụng phân trang cho danh sách dữliệu. 

- Nén và tối ưu hình ảnh khách sạn. 

- Thiết kếcơ sởdữliệu hợp lý. 

- Kiểm tra hệthống với nhiều người dùng truy cập cùng lúc. 

### **5.3 Availability – Tính sẵn sàng** 

- Đảm bảo hệthống hoạt động ổn định trong thời gian demo. 

- Xửlý lỗi khi đăng nhập, tìm kiếm và đặt phòng. 

- Kiểm tra phòng còn trống trước khi xác nhận đặt. 

- Ngăn chặn hai người đặt cùng một phòng. 

- Hiển thịthông báo khi hệthống hoặc thanh toán gặp lỗi. 

- Ghi log lỗi cơ bản đểhỗtrợkiểm tra. 

### **5.4 Usability – Tính dễsửdụng** 

- Thiết kếgiao diện đơn giản, dễhiểu. 

- Cho phép tìm kiếm theo địa điểm, ngày nhận/trảphòng và sốkhách. 

- Hiển thịthông tin khách sạn, phòng, giá và tiện nghi. 

- Quy trình đặt phòng gồm các bước rõ ràng. 

- Hiển thịthông báo lỗi dễhiểu. 

- Cho phép xem lịch sửvà trạng thái đặt phòng. 

- Cho phép hủy phòng theo chính sách. 

- Gửi thông báo xác nhận đặt phòng. 

31 

### **5.5 Responsive – Tương thích thiết bị** 

- Hỗtrợgiao diện máy tính và điện thoại. 

- Tựđộng điều chỉnh kích thước màn hình. 

- Menu và bộlọc phù hợp với màn hình nhỏ. 

- Hình ảnh và bảng thông tin không bịtràn. 

- Kiểm tra trên Chrome và một trình duyệt phổbiến khác. 

- Kiểm tra trên Android hoặc iOS nếu có điều kiện. 

### **5.6 Backup – Sao lưu** 

- Sao lưu cơ sởdữliệu định kỳ. 

- Sao lưu thông tin tài khoản, khách sạn, phòng và đơn đặt phòng. 

- Lưu một bản backup riêng ngoài hệthống chính. 

- Kiểm tra khảnăng khôi phục dữliệu. 

- Sao lưu trước khi cập nhật hoặc thay đổi lớn. 

- Ghi lại hướng dẫn khôi phục dữliệu khi xảy ra lỗi. 

32 

