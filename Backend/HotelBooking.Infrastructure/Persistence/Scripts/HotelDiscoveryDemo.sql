-- Demo/test databases only. Run base schema and additive upgrades first.
IF DB_NAME() NOT LIKE '%Demo%' AND DB_NAME() NOT LIKE '%Test%' AND DB_NAME() NOT LIKE '%Preview%'
    THROW 50001, 'Use a separate Demo/Test/Preview database for this seed.', 1;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @hotel int, @area int, @type int, @amenity int;
SELECT @hotel = HotelId FROM Hotels WHERE HotelName = N'Discovery Demo - Huế';
IF @hotel IS NULL
BEGIN
    INSERT Hotels(HotelName, Description, Address, City, Country, Phone, Email, CheckInTime, CheckOutTime)
    VALUES(N'Discovery Demo - Huế', N'Dữ liệu demo cho tìm kiếm và báo cáo', N'10 Đường Demo', N'Huế', N'Vietnam', '0900000000', 'discovery-demo@example.test', '14:00', '12:00');
    SET @hotel = SCOPE_IDENTITY();
END;
SELECT @area = AreaId FROM HotelAreas WHERE HotelId = @hotel AND AreaName = N'Khu Demo';
IF @area IS NULL
BEGIN
    INSERT HotelAreas(HotelId, AreaName, AreaType) VALUES(@hotel, N'Khu Demo', 'Zone');
    SET @area = SCOPE_IDENTITY();
END;
SELECT @type = RoomTypeId FROM RoomTypes WHERE HotelId = @hotel AND AreaId = @area AND RoomTypeName = N'Deluxe Demo';
IF @type IS NULL
BEGIN
    INSERT RoomTypes(HotelId, AreaId, RoomTypeName, BasePrice, Capacity, NumberOfBeds)
    VALUES(@hotel, @area, N'Deluxe Demo', 500000, 2, 1);
    SET @type = SCOPE_IDENTITY();
END;
IF NOT EXISTS(SELECT 1 FROM Rooms WHERE AreaId = @area AND RoomNumber = 'D101')
    INSERT Rooms(AreaId, RoomTypeId, RoomNumber, Floor, Status) VALUES(@area, @type, 'D101', 1, 'Available');
IF NOT EXISTS(SELECT 1 FROM Rooms WHERE AreaId = @area AND RoomNumber = 'D102')
    INSERT Rooms(AreaId, RoomTypeId, RoomNumber, Floor, Status) VALUES(@area, @type, 'D102', 1, 'Available');
SELECT @amenity = AmenityId FROM Amenities WHERE AmenityName = N'Wi-Fi Demo';
IF @amenity IS NULL
BEGIN
    INSERT Amenities(AmenityName, Description) VALUES(N'Wi-Fi Demo', N'Tiện ích thử nghiệm');
    SET @amenity = SCOPE_IDENTITY();
END;
IF NOT EXISTS(SELECT 1 FROM HotelAmenities WHERE HotelId = @hotel AND AmenityId = @amenity)
    INSERT HotelAmenities(HotelId, AmenityId) VALUES(@hotel, @amenity);
IF NOT EXISTS(SELECT 1 FROM HotelDiscoverySettings WHERE HotelId = @hotel)
    INSERT HotelDiscoverySettings(HotelId, CancellationPolicy) VALUES(@hotel, N'Chính sách demo: liên hệ khách sạn để xác nhận điều kiện hủy.');
COMMIT;
SELECT @hotel AS HotelId, @area AS AreaId, @type AS RoomTypeId;
