# Cấu hình gửi OTP email

Không commit `appsettings.Local.json` hoặc App Password thật lên Git.

## Thiết lập trên máy mới

1. Sao chép `Backend/HotelBooking.API/appsettings.Local.example.json` thành
   `Backend/HotelBooking.API/appsettings.Local.json`.
2. Điền Gmail gửi thư vào `Username` và `FromAddress`.
3. Bật xác minh hai bước của Google và tạo App Password 16 ký tự.
4. Điền App Password vào `Password`.
5. Chạy API bằng môi trường Development:

```powershell
dotnet run --project Backend/HotelBooking.API --launch-profile http
```

Email nhận OTP phải thuộc một tài khoản đang hoạt động trong bảng `Users`.

## Cấu hình bằng biến môi trường

Máy chủ CI/CD hoặc môi trường production nên dùng secret store và các biến:

```text
AuthDelivery__Smtp__Host
AuthDelivery__Smtp__Port
AuthDelivery__Smtp__EnableSsl
AuthDelivery__Smtp__Username
AuthDelivery__Smtp__Password
AuthDelivery__Smtp__FromAddress
AuthDelivery__Smtp__FromName
```

Không ghi giá trị secret vào source code, log, pull request hoặc tài liệu nhóm.
