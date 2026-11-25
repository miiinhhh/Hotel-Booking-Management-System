# StayLuxe Android

Ứng dụng Android (Java, MVVM, Retrofit) dùng chung Backend với website.

| Phần | Đối tượng | Chức năng chính |
|---|---|---|
| Khách hàng | Customer | Đăng ký/đăng nhập, tìm khách sạn ở Đà Nẵng, xem phòng, đặt phòng, thanh toán VNPay hoặc tại khách sạn, xem/hủy đơn, đánh giá, ưu đãi, tài khoản |
| Cổng nội bộ | Hotel Staff, vai trò tùy chỉnh, Admin | Đơn đặt phòng, lịch phòng & khóa bán, phân khu & phòng, khách hàng, kiểm duyệt đánh giá, thông báo; Admin thêm giá, voucher, tài khoản, vai trò, nội dung, báo cáo |

Các mục trong cổng nội bộ hiện theo quyền của tài khoản (giống website).

## Cài nhanh

File cài đặt đã build sẵn: `Frontend/public/downloads/stayluxe.apk`. Website cũng có nút tải ở trang chủ.
Bản này gọi Backend tại `http://10.47.181.65:5131/`; dùng máy khác thì build lại theo hướng dẫn bên dưới.

## Chạy Backend cho điện thoại

Mặc định Backend chỉ nghe ở `localhost`, điện thoại không gọi tới được. Chạy bằng profile cho mạng LAN:

```powershell
cd Backend
dotnet run --project HotelBooking.API --launch-profile http-lan
```

- Điện thoại và máy tính phải cùng mạng Wi-Fi.
- Nếu không kết nối được, mở cổng 5131 trên Windows Firewall:
  `New-NetFirewallRule -DisplayName "StayLuxe API" -Direction Inbound -Protocol TCP -LocalPort 5131 -Action Allow`

## Build lại với địa chỉ Backend khác

Địa chỉ Backend được đặt lúc build, không cần sửa code. Chọn một trong hai cách:

1. Thêm vào `Android/local.properties` (file riêng từng máy, không đưa lên repo):
   ```properties
   apiBaseUrl=http://192.168.1.10:5131/
   ```
2. Hoặc truyền khi build:
   ```powershell
   ./gradlew assembleRelease -PapiBaseUrl=http://192.168.1.10:5131/
   ```

Không khai báo gì thì app dùng `http://10.0.2.2:5131/` (localhost của máy tính khi chạy trên Android Emulator).

Lấy IP LAN của máy tính: `ipconfig` → dòng IPv4 của card Wi-Fi.

File APK sau khi build: `app/build/outputs/apk/release/app-release.apk`
(bản demo được ký bằng khóa debug để cài trực tiếp; không dùng để phát hành lên Google Play).

## Yêu cầu

- Android Studio (hoặc JDK 17+ và Android SDK), Android 7.0 (API 24) trở lên.
- Backend dùng HTTP trong mạng nội bộ nên app cho phép kết nối không mã hóa
  (`res/xml/network_security_config.xml`). Khi Backend chạy HTTPS thì tắt tùy chọn này.
