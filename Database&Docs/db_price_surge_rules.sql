USE HotelBooking;
GO

/* =========================================================================
   MIGRATION: Bang PriceSurgeRules - Dinh gia dong / Quy tac tang gia theo ngay
   Giai phap tach biet hoan toan khoi RoomPriceHistory (Chi luu lich su gia goc)
   ========================================================================= */

IF OBJECT_ID('dbo.PriceSurgeRules', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PriceSurgeRules
    (
        RuleId BIGINT IDENTITY(1,1) NOT NULL,
        HotelId INT NOT NULL,
        RoomTypeId INT NULL,               -- NULL: Ap dung cho tat ca hang phong trong khach san; Co ID: Ap dung rieng hang phong
        RuleName NVARCHAR(150) NOT NULL,    -- Ten quy tac (Vi du: 'Le hoi Halloween & Phao hoa', 'Cuoi tuan')
        StartDate DATE NOT NULL,           -- Ngay bat dau ap dung (bao gom ca ngay nay)
        EndDate DATE NOT NULL,             -- Ngay ket thuc ap dung (bao gom ca ngay nay)
        AdjustmentType NVARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' hoac 'FIXED_AMOUNT'
        AdjustmentValue DECIMAL(18,2) NOT NULL DEFAULT 0,          -- Ty le % hoac so tien cong them
        Priority INT NOT NULL DEFAULT 1,                           -- Muc do uu tien (so cang cao uu tien cang lon)
        IsActive BIT NOT NULL DEFAULT 1,                           -- Trang thai hoat dong (1: bat, 0: tat)
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

    -- Index ho tro tim kiem quy tac gia theo khach san, hang phong, thoi gian va trang thai
    CREATE INDEX IX_PriceSurgeRules_Lookup
        ON dbo.PriceSurgeRules (HotelId, RoomTypeId, StartDate, EndDate, IsActive);

    CREATE INDEX IX_PriceSurgeRules_DateRange
        ON dbo.PriceSurgeRules (StartDate, EndDate);

    PRINT 'Bang dbo.PriceSurgeRules da duoc tao thanh cong.';
END
ELSE
BEGIN
    PRINT 'Bang dbo.PriceSurgeRules da ton tai.';
END;
GO
