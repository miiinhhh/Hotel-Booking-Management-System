-- Run once against the HotelBooking database created by hotelbooking_full.sql.
-- Additive and idempotent: existing users, roles, reviews and assignments are preserved.
USE [HotelBooking];
GO
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.Roles', N'IsSystem') IS NULL
    ALTER TABLE dbo.Roles ADD IsSystem bit NOT NULL CONSTRAINT DF_Roles_IsSystem DEFAULT (0);
IF COL_LENGTH(N'dbo.Roles', N'IsActive') IS NULL
    ALTER TABLE dbo.Roles ADD IsActive bit NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1);

-- Dynamic SQL defers column binding until after the ALTER statements above finish.
-- Without this, SQL Server compiles the whole batch first and reports error 207
-- the first time the upgrade is executed.
EXEC sys.sp_executesql N'
    UPDATE dbo.Roles
    SET IsSystem = 1, IsActive = 1
    WHERE RoleName IN (''Customer'', ''Hotel Staff'', ''Admin'');';

IF OBJECT_ID(N'dbo.Permissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Permissions
    (
        PermissionId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Permissions PRIMARY KEY,
        PermissionCode varchar(100) NOT NULL,
        PermissionName nvarchar(150) NOT NULL,
        PermissionGroup nvarchar(100) NOT NULL,
        Description nvarchar(500) NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Permissions_IsActive DEFAULT (1),
        CONSTRAINT UQ_Permissions_Code UNIQUE (PermissionCode)
    );
END;

IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissions
    (
        RoleId int NOT NULL,
        PermissionId int NOT NULL,
        GrantedAt datetime2 NOT NULL CONSTRAINT DF_RolePermissions_GrantedAt DEFAULT (SYSDATETIME()),
        GrantedByUserId bigint NULL,
        CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleId, PermissionId),
        CONSTRAINT FK_RolePermissions_Role FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE,
        CONSTRAINT FK_RolePermissions_Permission FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(PermissionId) ON DELETE CASCADE
    );
    CREATE INDEX IX_RolePermissions_PermissionId ON dbo.RolePermissions(PermissionId);
END;

DECLARE @Definitions TABLE
(
    Code varchar(100) PRIMARY KEY, Name nvarchar(150), GroupName nvarchar(100), Description nvarchar(500)
);
INSERT INTO @Definitions(Code, Name, GroupName, Description) VALUES
('profile.self.manage', N'Quản lý hồ sơ cá nhân', N'Khách hàng', N'Xem, sửa hồ sơ, avatar và mật khẩu của chính mình.'),
('bookings.self.create', N'Tạo đặt phòng', N'Khách hàng', N'Tạo đặt phòng cho chính tài khoản.'),
('bookings.self.view', N'Xem đặt phòng cá nhân', N'Khách hàng', N'Xem lịch sử và chi tiết đặt phòng của chính mình.'),
('bookings.self.cancel', N'Hủy đặt phòng cá nhân', N'Khách hàng', N'Xem trước và hủy đặt phòng của chính mình.'),
('payments.self.manage', N'Thanh toán cá nhân', N'Khách hàng', N'Tạo và xem thanh toán cho đặt phòng của chính mình.'),
('reviews.self.manage', N'Quản lý đánh giá cá nhân', N'Khách hàng', N'Tạo, sửa, xem và xóa đánh giá của chính mình.'),
('wishlist.self.manage', N'Quản lý yêu thích', N'Khách hàng', N'Xem, thêm và gỡ khách sạn yêu thích.'),
('hotels.manage', N'Quản lý khách sạn', N'Khách sạn', N'Tạo, sửa và ngừng hoạt động khách sạn.'),
('areas.manage', N'Quản lý phân khu', N'Kho phòng', N'Quản lý Zone và Building.'),
('rooms.manage', N'Quản lý phòng', N'Kho phòng', N'Quản lý hạng phòng và phòng.'),
('inventory.view', N'Xem tình trạng phòng', N'Kho phòng', N'Xem tình trạng và lệnh khóa bán.'),
('inventory.manage', N'Vận hành kho phòng', N'Kho phòng', N'Khóa và mở bán phòng.'),
('bookings.view', N'Xem đặt phòng', N'Đặt phòng', N'Xem đặt phòng trong phạm vi được giao.'),
('bookings.manage', N'Xử lý đặt phòng', N'Đặt phòng', N'Cập nhật trạng thái và hủy đặt phòng.'),
('payments.view', N'Xem thanh toán', N'Thanh toán', N'Xem giao dịch thanh toán.'),
('payments.manage', N'Xác nhận thanh toán', N'Thanh toán', N'Xác nhận và xử lý thanh toán.'),
('pricing.view', N'Xem giá', N'Giá & khuyến mãi', N'Xem lịch sử giá và quy tắc phụ thu.'),
('pricing.manage', N'Quản lý giá', N'Giá & khuyến mãi', N'Cập nhật giá và quy tắc phụ thu.'),
('vouchers.view', N'Xem voucher', N'Giá & khuyến mãi', N'Xem danh sách voucher.'),
('vouchers.manage', N'Quản lý voucher', N'Giá & khuyến mãi', N'Tạo, sửa và ngừng voucher.'),
('staff.view', N'Xem nhân viên', N'Nhân sự', N'Xem nhân viên và phân công.'),
('staff.manage', N'Quản lý nhân viên', N'Nhân sự', N'Sửa, khóa và phân công nhân viên.'),
('accounts.manage', N'Quản trị tài khoản', N'Bảo mật', N'Xem, cập nhật, khóa và mở khóa tài khoản.'),
('roles.manage', N'Quản lý vai trò và quyền', N'Bảo mật', N'Tạo role, gán permission và gán role cho tài khoản.'),
('reviews.manage', N'Kiểm duyệt đánh giá', N'Nội dung', N'Xem và kiểm duyệt đánh giá.'),
('content.manage', N'Quản lý nội dung', N'Nội dung', N'Quản lý tiện ích và hình ảnh.'),
('policies.manage', N'Quản lý chính sách', N'Vận hành', N'Quản lý chính sách hủy và lưu trú.'),
('reports.view', N'Xem báo cáo', N'Báo cáo', N'Xem và xuất báo cáo kinh doanh.');

MERGE dbo.Permissions AS target
USING @Definitions AS source ON target.PermissionCode = source.Code
WHEN MATCHED THEN UPDATE SET PermissionName = source.Name, PermissionGroup = source.GroupName,
    Description = source.Description, IsActive = 1
WHEN NOT MATCHED THEN INSERT(PermissionCode, PermissionName, PermissionGroup, Description, IsActive)
    VALUES(source.Code, source.Name, source.GroupName, source.Description, 1);

INSERT INTO dbo.RolePermissions(RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.RoleName = 'Admin' AND p.IsActive = 1
AND p.PermissionCode NOT IN ('bookings.self.create','bookings.self.view','bookings.self.cancel','payments.self.manage','reviews.self.manage','wishlist.self.manage')
AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId AND rp.PermissionId = p.PermissionId);

-- Admin manages customer data through administrative permissions and must not
-- impersonate a customer by using personal booking/payment/review flows.
DELETE rp
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.RoleId = rp.RoleId AND r.RoleName = 'Admin'
JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
WHERE p.PermissionCode IN ('bookings.self.create','bookings.self.view','bookings.self.cancel','payments.self.manage','reviews.self.manage','wishlist.self.manage');

-- Customer is a self-service role. Remove any operational or administrative
-- permission that may have been assigned before this boundary was enforced.
DELETE rp
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.RoleId = rp.RoleId AND r.RoleName = 'Customer'
JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
WHERE p.PermissionCode NOT IN
('profile.self.manage','bookings.self.create','bookings.self.view','bookings.self.cancel','payments.self.manage','reviews.self.manage','wishlist.self.manage');

-- Hotel Staff is an operational role. Remove customer-only, configuration and
-- system-administration permissions that may have been assigned previously.
DELETE rp
FROM dbo.RolePermissions rp
JOIN dbo.Roles r ON r.RoleId = rp.RoleId AND r.RoleName = 'Hotel Staff'
JOIN dbo.Permissions p ON p.PermissionId = rp.PermissionId
WHERE p.PermissionCode NOT IN
('profile.self.manage','inventory.view','inventory.manage','bookings.view','bookings.manage',
 'payments.view','payments.manage','pricing.view','staff.view','policies.manage');

INSERT INTO dbo.RolePermissions(RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM dbo.Roles r JOIN dbo.Permissions p ON p.PermissionCode IN
('profile.self.manage','inventory.view','inventory.manage','bookings.view','bookings.manage','payments.view','payments.manage','pricing.view','staff.view','policies.manage')
WHERE r.RoleName = 'Hotel Staff'
-- Only bootstrap a role that has never been configured. Re-running this script
-- must not restore permissions that an administrator deliberately disabled.
AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId);

INSERT INTO dbo.RolePermissions(RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId FROM dbo.Roles r JOIN dbo.Permissions p ON p.PermissionCode IN
('profile.self.manage','bookings.self.create','bookings.self.view','bookings.self.cancel','payments.self.manage','reviews.self.manage','wishlist.self.manage')
WHERE r.RoleName = 'Customer'
AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.RoleId);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
