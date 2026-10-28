USE HotelBooking;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

/* =========================================================================
   PHẦN 1: TẠO BẢNG PriceSurgeRules (Quy tắc định giá động)
   ========================================================================= */

IF OBJECT_ID('dbo.PriceSurgeRules', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PriceSurgeRules
    (
        RuleId BIGINT IDENTITY(1,1) NOT NULL,
        HotelId INT NOT NULL,
        RoomTypeId INT NULL,               -- NULL: Áp dụng toàn khách sạn; Có ID: Áp dụng riêng từng hạng phòng
        RuleName NVARCHAR(150) NOT NULL,
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        AdjustmentType NVARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' hoặc 'FIXED_AMOUNT'
        AdjustmentValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        Priority INT NOT NULL DEFAULT 1,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_PriceSurgeRules_CreatedAt DEFAULT SYSDATETIME(),
        CreatedByUserId BIGINT NOT NULL,

        CONSTRAINT PK_PriceSurgeRules
            PRIMARY KEY (RuleId),

        CONSTRAINT FK_PriceSurgeRules_Hotel
            FOREIGN KEY (HotelId)
            REFERENCES dbo.Hotels(HotelId),

        CONSTRAINT FK_PriceSurgeRules_RoomType
            FOREIGN KEY (RoomTypeId)
            REFERENCES dbo.RoomTypes(RoomTypeId),

        CONSTRAINT FK_PriceSurgeRules_CreatedByUser
            FOREIGN KEY (CreatedByUserId)
            REFERENCES dbo.Users(UserId),

        CONSTRAINT CK_PriceSurgeRules_DateRange
            CHECK (EndDate >= StartDate),

        CONSTRAINT CK_PriceSurgeRules_AdjustmentType
            CHECK (AdjustmentType IN ('PERCENTAGE', 'FIXED_AMOUNT')),

        CONSTRAINT CK_PriceSurgeRules_AdjustmentValue
            CHECK (AdjustmentValue >= 0)
    );

    CREATE INDEX IX_PriceSurgeRules_Lookup
        ON dbo.PriceSurgeRules (HotelId, RoomTypeId, StartDate, EndDate, IsActive);

    CREATE INDEX IX_PriceSurgeRules_DateRange
        ON dbo.PriceSurgeRules (StartDate, EndDate);

    PRINT 'Thành công: Đã tạo bảng dbo.PriceSurgeRules.';
END
ELSE
BEGIN
    PRINT 'Bỏ qua: Bảng dbo.PriceSurgeRules đã tồn tại.';
END;
GO

/* =========================================================================
   PHẦN 2: CẬP NHẬT CỘT & RÀNG BUỘC CHO BẢNG Vouchers
   ========================================================================= */

-- 1. Thêm cột mức giảm tối đa (MaxDiscountAmount)
IF COL_LENGTH('dbo.Vouchers', 'MaxDiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Vouchers
    ADD MaxDiscountAmount DECIMAL(18,2) NULL;
    PRINT 'Thành công: Đã thêm cột MaxDiscountAmount vào dbo.Vouchers.';
END;
GO

-- 2. Thêm cột giới hạn sử dụng theo từng khách hàng (UsageLimitPerCustomer)
IF COL_LENGTH('dbo.Vouchers', 'UsageLimitPerCustomer') IS NULL
BEGIN
    ALTER TABLE dbo.Vouchers
    ADD UsageLimitPerCustomer INT NOT NULL
        CONSTRAINT DF_Vouchers_UsageLimitPerCustomer
        DEFAULT (1) WITH VALUES;
    PRINT 'Thành công: Đã thêm cột UsageLimitPerCustomer vào dbo.Vouchers.';
END;
GO

-- 3. Ràng buộc kiểm tra: UsageLimitPerCustomer > 0
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Vouchers_UsageLimitPerCustomer'
      AND parent_object_id = OBJECT_ID('dbo.Vouchers')
)
BEGIN
    ALTER TABLE dbo.Vouchers
    ADD CONSTRAINT CK_Vouchers_UsageLimitPerCustomer
    CHECK (UsageLimitPerCustomer > 0);
    PRINT 'Thành công: Đã tạo ràng buộc CK_Vouchers_UsageLimitPerCustomer.';
END;
GO

-- 4. Ràng buộc kiểm tra: MaxDiscountAmount >= 0 hoặc NULL
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Vouchers_MaxDiscountAmount'
      AND parent_object_id = OBJECT_ID('dbo.Vouchers')
)
BEGIN
    ALTER TABLE dbo.Vouchers
    ADD CONSTRAINT CK_Vouchers_MaxDiscountAmount
    CHECK (
        MaxDiscountAmount IS NULL
        OR MaxDiscountAmount >= 0
    );
    PRINT 'Thành công: Đã tạo ràng buộc CK_Vouchers_MaxDiscountAmount.';
END;
GO

/* =========================================================================
   PHẦN 3: TẠO BẢNG VoucherUsages (Lịch sử sử dụng voucher)
   ========================================================================= */

IF OBJECT_ID('dbo.VoucherUsages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VoucherUsages
    (
        VoucherUsageId BIGINT IDENTITY(1,1) NOT NULL,
        VoucherId BIGINT NOT NULL,
        CustomerId BIGINT NOT NULL,
        BookingId BIGINT NOT NULL,
        DiscountApplied DECIMAL(18,2) NOT NULL,
        UsedAt DATETIME2 NOT NULL
            CONSTRAINT DF_VoucherUsages_UsedAt
            DEFAULT SYSDATETIME(),

        CONSTRAINT PK_VoucherUsages
            PRIMARY KEY (VoucherUsageId),

        CONSTRAINT FK_VoucherUsages_Voucher
            FOREIGN KEY (VoucherId)
            REFERENCES dbo.Vouchers(VoucherId),

        CONSTRAINT FK_VoucherUsages_Customer
            FOREIGN KEY (CustomerId)
            REFERENCES dbo.Users(UserId),

        CONSTRAINT FK_VoucherUsages_Booking
            FOREIGN KEY (BookingId)
            REFERENCES dbo.Bookings(BookingId),

        CONSTRAINT CK_VoucherUsages_DiscountApplied
            CHECK (DiscountApplied >= 0),

        CONSTRAINT UQ_VoucherUsages_Voucher_Booking
            UNIQUE (VoucherId, BookingId)
    );

    CREATE INDEX IX_VoucherUsages_Voucher_Customer
        ON dbo.VoucherUsages (VoucherId, CustomerId);

    CREATE INDEX IX_VoucherUsages_Customer
        ON dbo.VoucherUsages (CustomerId);

    PRINT 'Thành công: Đã tạo bảng dbo.VoucherUsages.';
END
ELSE
BEGIN
    PRINT 'Bỏ qua: Bảng dbo.VoucherUsages đã tồn tại.';
END;
GO