 USE HotelBooking;                                                                                             
    GO                                                                                                            
                                                                                                                  
    SET ANSI_NULLS ON;                                                                                            
    SET QUOTED_IDENTIFIER ON;                                                                                     
    SET XACT_ABORT ON;                                                                                            
                                                                                                                  
    BEGIN TRANSACTION;                                                                                            
                                                                                                                  
    -- =========================================================                                                  
    -- 1. ROLES                                                                                                   
    -- =========================================================                                                  
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Admin')                                                  
        INSERT INTO Roles (RoleName, Description) VALUES ('Admin', N'Quản trị viên toàn hệ thống');               
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Hotel Staff')                                            
        INSERT INTO Roles (RoleName, Description) VALUES ('Hotel Staff', N'Nhân viên lễ tân và quản lý buồng      
        phòng');                                                                                                  
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Customer')                                               
        INSERT INTO Roles (RoleName, Description) VALUES ('Customer', N'Khách hàng đặt phòng trực tuyến');        
                                                                                                                  
    DECLARE @AdminRoleId INT = (SELECT TOP 1 RoleId FROM Roles WHERE RoleName = 'Admin');                         
    DECLARE @StaffRoleId INT = (SELECT TOP 1 RoleId FROM Roles WHERE RoleName = 'Hotel Staff');                   
    DECLARE @CustRoleId INT = (SELECT TOP 1 RoleId FROM Roles WHERE RoleName = 'Customer');                       
                                                                                                                  
    -- =========================================================                                                  
    -- 2. USERS (Mật khẩu: Admin@12345, Staff@12345, Customer@12345)                                              
    -- =========================================================                                                  
    DECLARE @AdminId BIGINT = (SELECT TOP 1 UserId FROM Users WHERE Email = 'admin@hotelbooking.vn');             
    IF @AdminId IS NULL                                                                                           
    BEGIN                                                                                                         
        INSERT INTO Users (FullName, Email, PasswordHash, Phone, DateOfBirth, IsActive, CreatedAt)                
        VALUES (N'Nguyễn Quản Trị', 'admin@hotelbooking.vn',                                                      
        'PBKDF2-SHA256$100000$Hm1zyvWlVW8sUtgdaVwzDQ==$Rqn6cJ/W+nTap6oe3Gi+dOP10Ce05cVlIndPIHbcjiQ=',             
        '0901112233', '1988-05-15', 1, SYSDATETIME());                                                            
        SET @AdminId = SCOPE_IDENTITY();                                                                          
    END;                                                                                                          
                                                                                                                  
    DECLARE @StaffId BIGINT = (SELECT TOP 1 UserId FROM Users WHERE Email = 'staff.tuan@hotelbooking.vn');        
    IF @StaffId IS NULL                                                                                           
    BEGIN                                                                                                         
        INSERT INTO Users (FullName, Email, PasswordHash, Phone, DateOfBirth, IsActive, CreatedAt)                
        VALUES (N'Trần Anh Tuấn', 'staff.tuan@hotelbooking.vn',                                                   
        'PBKDF2-SHA256$100000$o80Zj7dZUpi4ERirFzQOCQ==$AuEm4oOuAVUUM0JjUACUh5RWa7r+kJqZT0bN80yaaNI=',             
        '0912223344', '1995-10-20', 1, SYSDATETIME());                                                            
        SET @StaffId = SCOPE_IDENTITY();                                                                          
    END;                                                                                                          
                                                                                                                  
    DECLARE @CustNamId BIGINT = (SELECT TOP 1 UserId FROM Users WHERE Email = 'customer.nam@gmail.com');          
    IF @CustNamId IS NULL                                                                                         
    BEGIN                                                                                                         
        INSERT INTO Users (FullName, Email, PasswordHash, Phone, DateOfBirth, IsActive, CreatedAt)                
        VALUES (N'Hoàng Nam', 'customer.nam@gmail.com',                                                           
        'PBKDF2-SHA256$100000$Lao0pFnZNOueFM3lEjvJOQ==$08FW/KLahNzBWZMKMPRgu30S5yuEaSALmOfnHQ3UZXQ=',             
        '0934445566', '1992-07-08', 1, SYSDATETIME());                                                            
        SET @CustNamId = SCOPE_IDENTITY();                                                                        
    END;                                                                                                          
                                                                                                                  
    DECLARE @CustDuongId BIGINT = (SELECT TOP 1 UserId FROM Users WHERE Email = 'customer.duong@gmail.com');      
    IF @CustDuongId IS NULL                                                                                       
    BEGIN                                                                                                         
        INSERT INTO Users (FullName, Email, PasswordHash, Phone, DateOfBirth, IsActive, CreatedAt)                
        VALUES (N'Phạm Thùy Dương', 'customer.duong@gmail.com',                                                   
        'PBKDF2-SHA256$100000$Lao0pFnZNOueFM3lEjvJOQ==$08FW/KLahNzBWZMKMPRgu30S5yuEaSALmOfnHQ3UZXQ=',             
        '0945556677', '1996-11-25', 1, SYSDATETIME());                                                            
        SET @CustDuongId = SCOPE_IDENTITY();                                                                      
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 3. USER_ROLES                                                                                              
    -- =========================================================                                                  
    IF @AdminId IS NOT NULL AND @AdminRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId =   
    @AdminId AND RoleId = @AdminRoleId)                                                                           
        INSERT INTO UserRoles (UserId, RoleId) VALUES (@AdminId, @AdminRoleId);                                   
    IF @StaffId IS NOT NULL AND @StaffRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId =   
    @StaffId AND RoleId = @StaffRoleId)                                                                           
        INSERT INTO UserRoles (UserId, RoleId) VALUES (@StaffId, @StaffRoleId);                                   
    IF @CustNamId IS NOT NULL AND @CustRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId =  
    @CustNamId AND RoleId = @CustRoleId)                                                                          
        INSERT INTO UserRoles (UserId, RoleId) VALUES (@CustNamId, @CustRoleId);                                  
    IF @CustDuongId IS NOT NULL AND @CustRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId =
    @CustDuongId AND RoleId = @CustRoleId)                                                                        
        INSERT INTO UserRoles (UserId, RoleId) VALUES (@CustDuongId, @CustRoleId);                                
                                                                                                                  
    -- =========================================================                                                  
    -- 4. HOTELS                                                                                                  
    -- =========================================================                                                  
    DECLARE @HotelLotusId INT = (SELECT TOP 1 HotelId FROM Hotels WHERE Email = 'booking@lotushotel.vn');         
    IF @HotelLotusId IS NULL                                                                                      
    BEGIN                                                                                                         
        INSERT INTO Hotels (HotelName, Description, Address, City, Country, Phone, Email, Website, CheckInTime,   
        CheckOutTime, IsActive)                                                                                   
        VALUES (N'Lotus Riverside Hotel Hanoi', N'Khách sạn 5 sao ven hồ Tây view toàn cảnh thủ đô', N'188 Nghi   
        Tàm, Yên Phụ, Tây Hồ', N'Hà Nội', N'Vietnam', '02438889999', 'booking@lotushotel.vn',                     
        'https://lotushotel.vn', '14:00', '12:00', 1);                                                            
        SET @HotelLotusId = SCOPE_IDENTITY();                                                                     
    END;                                                                                                          
                                                                                                                  
    DECLARE @HotelSaigonId INT = (SELECT TOP 1 HotelId FROM Hotels WHERE Email = 'contact@saigonpearl.vn');       
    IF @HotelSaigonId IS NULL                                                                                     
    BEGIN                                                                                                         
        INSERT INTO Hotels (HotelName, Description, Address, City, Country, Phone, Email, Website, CheckInTime,   
        CheckOutTime, IsActive)                                                                                   
        VALUES (N'Saigon Pearl Oasis Hotel', N'Khách sạn nghỉ dưỡng trung tâm Quận 1 view sông Sài Gòn', N'45 Tôn 
        Đức Thắng, Bến Nghé, Quận 1', N'Hồ Chí Minh', N'Vietnam', '02837778888', 'contact@saigonpearl.vn',        
        'https://saigonpearl.vn', '14:00', '12:00', 1);                                                           
        SET @HotelSaigonId = SCOPE_IDENTITY();                                                                    
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 5. HOTEL_AREAS (Lấy ID bằng SCOPE_IDENTITY hoặc fallback an toàn)                                          
    -- =========================================================                                                  
    DECLARE @AreaLotusId INT = (SELECT TOP 1 AreaId FROM HotelAreas WHERE HotelId = @HotelLotusId AND AreaName =  
    N'Tòa Landmark Tây Hồ');                                                                                      
    IF @AreaLotusId IS NULL AND @HotelLotusId IS NOT NULL                                                         
    BEGIN                                                                                                         
        INSERT INTO HotelAreas (HotelId, AreaName, AreaType, Description, FloorCount, IsActive)                   
        VALUES (@HotelLotusId, N'Tòa Landmark Tây Hồ', 'Building', N'Tòa nhà trung tâm 15 tầng', 15, 1);          
        SET @AreaLotusId = SCOPE_IDENTITY();                                                                      
    END;                                                                                                          
                                                                                                                  
    DECLARE @AreaSaigonId INT = (SELECT TOP 1 AreaId FROM HotelAreas WHERE HotelId = @HotelSaigonId AND AreaName =
    N'Tháp Diamond Tower');                                                                                       
    IF @AreaSaigonId IS NULL AND @HotelSaigonId IS NOT NULL                                                       
    BEGIN                                                                                                         
        INSERT INTO HotelAreas (HotelId, AreaName, AreaType, Description, FloorCount, IsActive)                   
        VALUES (@HotelSaigonId, N'Tháp Diamond Tower', 'Building', N'Tòa tháp khách sạn 20 tầng', 20, 1);         
        SET @AreaSaigonId = SCOPE_IDENTITY();                                                                     
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 6. STAFF_AREA_ASSIGNMENTS (Bảo vệ bằng điều kiện IS NOT NULL)                                              
    -- =========================================================                                                  
    IF @StaffId IS NOT NULL AND @AreaLotusId IS NOT NULL                                                          
    BEGIN                                                                                                         
        IF NOT EXISTS (SELECT 1 FROM StaffAreaAssignments WHERE UserId = @StaffId AND AreaId = @AreaLotusId)      
            INSERT INTO StaffAreaAssignments (UserId, AreaId, AssignedByUserId, IsActive)                         
            VALUES (@StaffId, @AreaLotusId, @AdminId, 1);                                                         
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 7. AMENITIES                                                                                               
    -- =========================================================                                                  
    IF NOT EXISTS (SELECT 1 FROM Amenities WHERE AmenityName = N'Wifi tốc độ cao')                                
        INSERT INTO Amenities (AmenityName, Description, IsActive) VALUES (N'Wifi tốc độ cao', N'Internet cáp     
        quang miễn phí', 1);                                                                                      
    IF NOT EXISTS (SELECT 1 FROM Amenities WHERE AmenityName = N'Hồ bơi vô cực')                                  
        INSERT INTO Amenities (AmenityName, Description, IsActive) VALUES (N'Hồ bơi vô cực', N'Hồ bơi tầng        
        thượng', 1);                                                                                              
    IF NOT EXISTS (SELECT 1 FROM Amenities WHERE AmenityName = N'Bữa sáng buffet')                                
        INSERT INTO Amenities (AmenityName, Description, IsActive) VALUES (N'Bữa sáng buffet', N'Tiệc sáng Á-Âu   
        miễn phí', 1);                                                                                            
    IF NOT EXISTS (SELECT 1 FROM Amenities WHERE AmenityName = N'Smart TV 55 inch')                               
        INSERT INTO Amenities (AmenityName, Description, IsActive) VALUES (N'Smart TV 55 inch', N'Truyền hình vệ  
        tinh & Netflix', 1);                                                                                      
                                                                                                                  
    -- =========================================================                                                  
    -- 8. ROOM_TYPES                                                                                              
    -- =========================================================                                                  
    DECLARE @RtDeluxeId INT = (SELECT TOP 1 RoomTypeId FROM RoomTypes WHERE HotelId = @HotelLotusId AND           
    RoomTypeName = N'Deluxe City View');                                                                          
    IF @RtDeluxeId IS NULL AND @HotelLotusId IS NOT NULL AND @AreaLotusId IS NOT NULL                             
    BEGIN                                                                                                         
        INSERT INTO RoomTypes (HotelId, AreaId, RoomTypeName, Description, BasePrice, Capacity, NumberOfBeds,     
        IsActive)                                                                                                 
        VALUES (@HotelLotusId, @AreaLotusId, N'Deluxe City View', N'Phòng 35m2 ban công ngắm thành phố', 1200000, 
        2, 1, 1);                                                                                                 
        SET @RtDeluxeId = SCOPE_IDENTITY();                                                                       
    END;                                                                                                          
                                                                                                                  
    DECLARE @RtSuiteId INT = (SELECT TOP 1 RoomTypeId FROM RoomTypes WHERE HotelId = @HotelLotusId AND            
    RoomTypeName = N'Suite Executive Lake View');                                                                 
    IF @RtSuiteId IS NULL AND @HotelLotusId IS NOT NULL AND @AreaLotusId IS NOT NULL                              
    BEGIN                                                                                                         
        INSERT INTO RoomTypes (HotelId, AreaId, RoomTypeName, Description, BasePrice, Capacity, NumberOfBeds,     
        IsActive)                                                                                                 
        VALUES (@HotelLotusId, @AreaLotusId, N'Suite Executive Lake View', N'Phòng 60m2 nhìn toàn cảnh hồ Tây',   
        2500000, 2, 1, 1);                                                                                        
        SET @RtSuiteId = SCOPE_IDENTITY();                                                                        
    END;                                                                                                          
                                                                                                                  
    DECLARE @RtPremierId INT = (SELECT TOP 1 RoomTypeId FROM RoomTypes WHERE HotelId = @HotelSaigonId AND         
    RoomTypeName = N'Premier King Saigon View');                                                                  
    IF @RtPremierId IS NULL AND @HotelSaigonId IS NOT NULL AND @AreaSaigonId IS NOT NULL                          
    BEGIN                                                                                                         
        INSERT INTO RoomTypes (HotelId, AreaId, RoomTypeName, Description, BasePrice, Capacity, NumberOfBeds,     
        IsActive)                                                                                                 
        VALUES (@HotelSaigonId, @AreaSaigonId, N'Premier King Saigon View', N'Phòng 45m2 view sông Sài Gòn',      
        2100000, 2, 1, 1);                                                                                        
        SET @RtPremierId = SCOPE_IDENTITY();                                                                      
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 9. ROOMS                                                                                                   
    -- =========================================================                                                  
    DECLARE @RoomL101Id BIGINT = (SELECT TOP 1 RoomId FROM Rooms WHERE AreaId = @AreaLotusId AND RoomNumber =     
    'L101');                                                                                                      
    IF @RoomL101Id IS NULL AND @RtDeluxeId IS NOT NULL AND @AreaLotusId IS NOT NULL                               
    BEGIN                                                                                                         
        INSERT INTO Rooms (RoomTypeId, AreaId, RoomNumber, Floor, Status, Description, IsActive)                  
        VALUES (@RtDeluxeId, @AreaLotusId, 'L101', 1, 'Available', N'Phòng Deluxe tầng 1', 1);                    
        SET @RoomL101Id = SCOPE_IDENTITY();                                                                       
    END;                                                                                                          
                                                                                                                  
    DECLARE @RoomL201Id BIGINT = (SELECT TOP 1 RoomId FROM Rooms WHERE AreaId = @AreaLotusId AND RoomNumber =     
    'L201');                                                                                                      
    IF @RoomL201Id IS NULL AND @RtSuiteId IS NOT NULL AND @AreaLotusId IS NOT NULL                                
    BEGIN                                                                                                         
        INSERT INTO Rooms (RoomTypeId, AreaId, RoomNumber, Floor, Status, Description, IsActive)                  
        VALUES (@RtSuiteId, @AreaLotusId, 'L201', 2, 'Occupied', N'Phòng Suite tầng 2 đang có khách', 1);         
        SET @RoomL201Id = SCOPE_IDENTITY();                                                                       
    END;                                                                                                          
                                                                                                                  
    DECLARE @RoomD1201Id BIGINT = (SELECT TOP 1 RoomId FROM Rooms WHERE AreaId = @AreaSaigonId AND RoomNumber =   
    'D1201');                                                                                                     
    IF @RoomD1201Id IS NULL AND @RtPremierId IS NOT NULL AND @AreaSaigonId IS NOT NULL                            
    BEGIN                                                                                                         
        INSERT INTO Rooms (RoomTypeId, AreaId, RoomNumber, Floor, Status, Description, IsActive)                  
        VALUES (@RtPremierId, @AreaSaigonId, 'D1201', 12, 'Available', N'Phòng Premier tầng 12 view sông', 1);    
        SET @RoomD1201Id = SCOPE_IDENTITY();                                                                      
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 10. VOUCHERS                                                                                               
    -- =========================================================                                                  
    DECLARE @VoucherId BIGINT = (SELECT TOP 1 VoucherId FROM Vouchers WHERE Code = 'WELCOME2026');                
    IF @VoucherId IS NULL                                                                                         
    BEGIN                                                                                                         
        INSERT INTO Vouchers (Code, VoucherType, DiscountValue, MinimumOrderAmount, StartAt, EndAt, UsageLimit,   
        UsedCount, IsActive, MaxDiscountAmount, UsageLimitPerCustomer)                                            
        VALUES ('WELCOME2026', 'Percentage', 10.00, 1000000, '2026-01-01', '2026-12-31 23:59:59', 1000, 1, 1,     
        300000, 1);                                                                                               
        SET @VoucherId = SCOPE_IDENTITY();                                                                        
    END;                                                                                                          
                                                                                                                  
    -- =========================================================                                                  
    -- 11. CANCELLATION POLICIES                                                                                  
    -- =========================================================                                                  
    IF @HotelLotusId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CancellationPolicies WHERE HotelId = @HotelLotusId 
    AND PolicyName = N'Hủy miễn phí trước 3 ngày')                                                                
        INSERT INTO CancellationPolicies (HotelId, PolicyName, DaysBeforeCheckIn, RefundPercentage,               
        DepositPenaltyPercentage, IsActive)                                                                       
        VALUES (@HotelLotusId, N'Hủy miễn phí trước 3 ngày', 3, 100.00, 0.00, 1);                                 
                                                                                                                  
    -- =========================================================                                                  
    -- 12. BOOKINGS                                                                                               
    -- =========================================================                                                  
    IF @CustDuongId IS NOT NULL AND @RoomL101Id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Bookings WHERE          
    BookingCode = 'BK2026012001')                                                                                 
    BEGIN                                                                                                         
        INSERT INTO Bookings (                                                                                    
            BookingCode, CustomerId, CheckInDate, CheckOutDate, NumberOfGuests,                                   
            BookingStatus, PaymentMethod, PaymentStatus,                                                          
            SubTotal, TaxAmount, FeeAmount, DiscountAmount, TotalAmount, DepositAmount, RemainingAmount,          
            VoucherId, SpecialRequests, CreatedAt                                                                 
        )                                                                                                         
        VALUES (                                                                                                  
            'BK2026012001', @CustDuongId, '2026-01-20', '2026-01-22', 2,                                          
            'Completed', 'Deposit', 'Paid',                                                                       
            2400000, 240000, 0, 240000, 2400000, 720000, 0,                                                       
            @VoucherId, N'Phòng không hút thuốc', '2026-01-15 10:30:00'                                           
        );                                                                                                        
                                                                                                                  
        DECLARE @Bk1Id BIGINT = SCOPE_IDENTITY();                                                                 
                                                                                                                  
        INSERT INTO BookingDetails (BookingId, RoomId, UnitPrice, NumberOfNights, SubTotal)                       
        VALUES (@Bk1Id, @RoomL101Id, 1200000, 2, 2400000);                                                        
                                                                                                                  
        INSERT INTO BookingGuests (BookingId, FullName, Phone, Email, IsPrimaryGuest)                             
        VALUES (@Bk1Id, N'Phạm Thùy Dương', '0945556677', 'customer.duong@gmail.com', 1);                         
                                                                                                                  
        INSERT INTO Payments (BookingId, PaymentMethod, PaymentType, Amount, Status, TransactionCode, PaidAt)     
        VALUES                                                                                                    
        (@Bk1Id, 'Deposit', 'Payment', 720000, 'Paid', 'TXN_DEP_001', '2026-01-15 10:45:00'),                     
        (@Bk1Id, 'Cash', 'Payment', 1680000, 'Paid', 'TXN_CASH_002', '2026-01-22 11:30:00');                      
                                                                                                                  
        INSERT INTO Reviews (BookingId, CustomerId, Rating, Comment, Status)                                      
        VALUES (@Bk1Id, @CustDuongId, 5, N'Dịch vụ tuyệt vời, phòng ốc sạch đẹp view hồ lãng mạn!', 'Visible');   
    END;                                                                                                          
                                                                                                                  
    COMMIT TRANSACTION;                                                                                           
    PRINT N'===> ĐÃ SEED DỮ LIỆU HOTELBOOKING THÀNH CÔNG VÀ AN TOÀN! <===';                                       
    GO                                                                       