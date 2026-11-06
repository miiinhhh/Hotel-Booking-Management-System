-- Run against the existing HotelBooking database. Additive/idempotent upgrade.
-- Existing Visible reviews are preserved; only new SQL inserts default to Hidden.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.Reviews', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reviews (
        ReviewId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Reviews PRIMARY KEY,
        BookingId BIGINT NOT NULL,
        CustomerId BIGINT NOT NULL,
        Rating TINYINT NOT NULL,
        Comment NVARCHAR(2000) NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_Reviews_Status DEFAULT 'Hidden',
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Reviews_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL,
        CONSTRAINT UQ_Reviews_BookingId UNIQUE (BookingId),
        CONSTRAINT FK_Reviews_Booking FOREIGN KEY (BookingId) REFERENCES dbo.Bookings(BookingId),
        CONSTRAINT FK_Reviews_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId),
        CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5),
        CONSTRAINT CK_Reviews_Status CHECK (Status IN ('Visible','Hidden','Deleted'))
    );
END;
DECLARE @statusDefault SYSNAME;
SELECT @statusDefault = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.Reviews') AND c.name = N'Status';
IF @statusDefault IS NOT NULL
BEGIN
    DECLARE @dropDefault NVARCHAR(MAX) = N'ALTER TABLE dbo.Reviews DROP CONSTRAINT ' + QUOTENAME(@statusDefault);
    EXEC sys.sp_executesql @dropDefault;
END;
ALTER TABLE dbo.Reviews ADD CONSTRAINT DF_Reviews_Status DEFAULT 'Hidden' FOR Status;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Reviews') AND name = N'IX_Reviews_Status_CreatedAt')
    CREATE INDEX IX_Reviews_Status_CreatedAt ON dbo.Reviews(Status, CreatedAt, ReviewId) INCLUDE(BookingId, Rating);

IF OBJECT_ID(N'dbo.ReviewModerationHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReviewModerationHistory (
        HistoryId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ReviewModerationHistory PRIMARY KEY,
        ReviewId BIGINT NOT NULL,
        ActorId BIGINT NOT NULL,
        OldStatus VARCHAR(20) NOT NULL,
        NewStatus VARCHAR(20) NOT NULL,
        Action VARCHAR(30) NOT NULL,
        Reason NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL,
        CONSTRAINT FK_ReviewModerationHistory_Review FOREIGN KEY (ReviewId) REFERENCES dbo.Reviews(ReviewId),
        CONSTRAINT FK_ReviewModerationHistory_Actor FOREIGN KEY (ActorId) REFERENCES dbo.Users(UserId),
        CONSTRAINT CK_ReviewModerationHistory_OldStatus CHECK (OldStatus IN ('Visible','Hidden','Deleted')),
        CONSTRAINT CK_ReviewModerationHistory_NewStatus CHECK (NewStatus IN ('Visible','Hidden','Deleted'))
    );
    CREATE INDEX IX_ReviewModerationHistory_Review ON dbo.ReviewModerationHistory(ReviewId, HistoryId);
END;
COMMIT TRANSACTION;
