-- Apply after PropertyContent.sql and the existing RoomEmergencyLocks schema.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.HotelDiscoverySettings') IS NULL
    CREATE TABLE dbo.HotelDiscoverySettings
    (
        HotelId int NOT NULL PRIMARY KEY REFERENCES dbo.Hotels(HotelId) ON DELETE CASCADE,
        CancellationPolicy nvarchar(2000) NULL
    );
IF OBJECT_ID('dbo.HotelWishlists') IS NULL
    CREATE TABLE dbo.HotelWishlists
    (
        UserId bigint NOT NULL REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        HotelId int NOT NULL REFERENCES dbo.Hotels(HotelId) ON DELETE CASCADE,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_HotelWishlists PRIMARY KEY (UserId, HotelId)
    );
COMMIT;
