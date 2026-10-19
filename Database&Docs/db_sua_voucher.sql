
USE HotelBooking;
GO

/* 1. Them muc giam toi da cho moi lan su dung */
IF COL_LENGTH('dbo.Vouchers', 'MaxDiscountAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Vouchers
    ADD MaxDiscountAmount DECIMAL(18,2) NULL;
END;
GO

/* 2. Them gioi han su dung theo tung khach hang */
IF COL_LENGTH('dbo.Vouchers', 'UsageLimitPerCustomer') IS NULL
BEGIN
    ALTER TABLE dbo.Vouchers
    ADD UsageLimitPerCustomer INT NOT NULL
        CONSTRAINT DF_Vouchers_UsageLimitPerCustomer
        DEFAULT (1) WITH VALUES;
END;
GO

/* 3. Dam bao gioi han su dung theo khach hang > 0 */
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
END;
GO

/* 4. Dam bao muc giam toi da khong am */
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
END;
GO

/* 5. Tao bang lich su su dung voucher */
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
END;
GO
