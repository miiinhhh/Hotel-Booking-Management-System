-- Run once against the existing HotelBooking database before using availability/booking.
-- Idempotent additive upgrade; does not recreate or drop existing data.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.RoomEmergencyLocks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RoomEmergencyLocks (
        LockId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RoomEmergencyLocks PRIMARY KEY,
        BatchId UNIQUEIDENTIFIER NOT NULL,
        HotelId INT NOT NULL,
        RoomId BIGINT NOT NULL,
        StartsAt DATETIME2 NOT NULL,
        EndsAt DATETIME2 NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        CreatedByUserId BIGINT NOT NULL,
        CreatedAt DATETIME2 NOT NULL,
        IsReleased BIT NOT NULL CONSTRAINT DF_RoomEmergencyLocks_IsReleased DEFAULT 0,
        ReleasedAt DATETIME2 NULL,
        ReleasedByUserId BIGINT NULL,
        CONSTRAINT CK_RoomEmergencyLocks_Range CHECK (EndsAt > StartsAt),
        CONSTRAINT CK_RoomEmergencyLocks_Reason CHECK (LEN(LTRIM(RTRIM(Reason))) > 0),
        CONSTRAINT FK_RoomEmergencyLocks_Hotel FOREIGN KEY (HotelId) REFERENCES dbo.Hotels(HotelId),
        CONSTRAINT FK_RoomEmergencyLocks_Room FOREIGN KEY (RoomId) REFERENCES dbo.Rooms(RoomId),
        CONSTRAINT FK_RoomEmergencyLocks_Creator FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_RoomEmergencyLocks_Releaser FOREIGN KEY (ReleasedByUserId) REFERENCES dbo.Users(UserId)
    );
    CREATE INDEX IX_RoomEmergencyLocks_Room_Range ON dbo.RoomEmergencyLocks(RoomId, StartsAt, EndsAt) INCLUDE(IsReleased);
    CREATE INDEX IX_RoomEmergencyLocks_Hotel ON dbo.RoomEmergencyLocks(HotelId, LockId);
END;
COMMIT TRANSACTION;
