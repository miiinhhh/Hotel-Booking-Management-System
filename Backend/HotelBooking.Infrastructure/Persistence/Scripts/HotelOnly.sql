-- Run in the database selected in ConnectionStrings:HotelDatabase.
-- This script only creates Hotels when it is absent; it does not alter existing tables.
IF OBJECT_ID(N'dbo.Hotels', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Hotels
    (
        HotelId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Hotels PRIMARY KEY,
        HotelName NVARCHAR(200) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        Address NVARCHAR(300) NOT NULL,
        City NVARCHAR(100) NOT NULL,
        Country NVARCHAR(100) NOT NULL CONSTRAINT DF_Hotels_Country DEFAULT N'Vietnam',
        Phone VARCHAR(20) NOT NULL,
        Email VARCHAR(255) NOT NULL,
        Website VARCHAR(500) NULL,
        CheckInTime TIME NOT NULL,
        CheckOutTime TIME NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Hotels_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Hotels_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT CK_Hotels_CheckInOut CHECK (CheckOutTime <> CheckInTime)
    );
END;
