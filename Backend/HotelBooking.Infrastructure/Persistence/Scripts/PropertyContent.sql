-- Run against the database created by Hotel_Booking_Database_Updated.sql.
-- Additive and rerunnable. Does not create/drop existing Hotel/Room data.
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.HotelImages') IS NULL OR OBJECT_ID('dbo.RoomImages') IS NULL
    THROW 50000, 'Create the base Hotel Booking schema before applying PropertyContent.sql.', 1;

IF COL_LENGTH('dbo.HotelImages', 'StorageKey') IS NULL
    ALTER TABLE dbo.HotelImages ADD StorageKey varchar(100) NULL;
IF COL_LENGTH('dbo.HotelImages', 'OriginalFileName') IS NULL
    ALTER TABLE dbo.HotelImages ADD OriginalFileName nvarchar(255) NULL;
IF COL_LENGTH('dbo.HotelImages', 'ContentType') IS NULL
    ALTER TABLE dbo.HotelImages ADD ContentType varchar(50) NULL;
IF COL_LENGTH('dbo.HotelImages', 'FileSize') IS NULL
    ALTER TABLE dbo.HotelImages ADD FileSize bigint NULL;
IF COL_LENGTH('dbo.HotelImages', 'Width') IS NULL
    ALTER TABLE dbo.HotelImages ADD Width int NULL;
IF COL_LENGTH('dbo.HotelImages', 'Height') IS NULL
    ALTER TABLE dbo.HotelImages ADD Height int NULL;

IF COL_LENGTH('dbo.RoomImages', 'StorageKey') IS NULL
    ALTER TABLE dbo.RoomImages ADD StorageKey varchar(100) NULL;
IF COL_LENGTH('dbo.RoomImages', 'OriginalFileName') IS NULL
    ALTER TABLE dbo.RoomImages ADD OriginalFileName nvarchar(255) NULL;
IF COL_LENGTH('dbo.RoomImages', 'ContentType') IS NULL
    ALTER TABLE dbo.RoomImages ADD ContentType varchar(50) NULL;
IF COL_LENGTH('dbo.RoomImages', 'FileSize') IS NULL
    ALTER TABLE dbo.RoomImages ADD FileSize bigint NULL;
IF COL_LENGTH('dbo.RoomImages', 'Width') IS NULL
    ALTER TABLE dbo.RoomImages ADD Width int NULL;
IF COL_LENGTH('dbo.RoomImages', 'Height') IS NULL
    ALTER TABLE dbo.RoomImages ADD Height int NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_HotelImages_Primary' AND object_id = OBJECT_ID('dbo.HotelImages'))
BEGIN
    -- Preserve the earliest existing primary, or promote the first ordered image.
    SELECT HotelImageId, ROW_NUMBER() OVER (PARTITION BY HotelId ORDER BY IsPrimary DESC, DisplayOrder, HotelImageId) AS rn
    INTO #HotelImageRanks FROM dbo.HotelImages WITH (TABLOCKX, HOLDLOCK);
    UPDATE dbo.HotelImages SET IsPrimary = 0;
    UPDATE i SET IsPrimary = 1 FROM dbo.HotelImages i JOIN #HotelImageRanks r ON i.HotelImageId = r.HotelImageId WHERE r.rn = 1;
    CREATE UNIQUE INDEX UX_HotelImages_Primary ON dbo.HotelImages(HotelId) WHERE IsPrimary = 1;
    DROP TABLE #HotelImageRanks;
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_RoomImages_Primary' AND object_id = OBJECT_ID('dbo.RoomImages'))
BEGIN
    SELECT RoomImageId, ROW_NUMBER() OVER (PARTITION BY RoomId ORDER BY IsPrimary DESC, DisplayOrder, RoomImageId) AS rn
    INTO #RoomImageRanks FROM dbo.RoomImages WITH (TABLOCKX, HOLDLOCK);
    UPDATE dbo.RoomImages SET IsPrimary = 0;
    UPDATE i SET IsPrimary = 1 FROM dbo.RoomImages i JOIN #RoomImageRanks r ON i.RoomImageId = r.RoomImageId WHERE r.rn = 1;
    CREATE UNIQUE INDEX UX_RoomImages_Primary ON dbo.RoomImages(RoomId) WHERE IsPrimary = 1;
    DROP TABLE #RoomImageRanks;
END;
IF OBJECT_ID('dbo.ImageFileDeletions') IS NULL
    CREATE TABLE dbo.ImageFileDeletions
    (
        Id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StorageKey varchar(100) NOT NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
COMMIT TRANSACTION;
