-- Apply once after Hotel_Booking_Database_Updated.sql.
-- Additive and rerunnable. Existing users and sessions are preserved.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.Users', 'AccessFailedCount') IS NULL
    ALTER TABLE dbo.Users ADD AccessFailedCount int NOT NULL CONSTRAINT DF_Users_AccessFailedCount DEFAULT 0 WITH VALUES;
IF COL_LENGTH('dbo.Users', 'LockoutEnd') IS NULL
    ALTER TABLE dbo.Users ADD LockoutEnd datetime2 NULL;
IF COL_LENGTH('dbo.Users', 'LastLoginAt') IS NULL
    ALTER TABLE dbo.Users ADD LastLoginAt datetime2 NULL;
IF COL_LENGTH('dbo.Users', 'TokenVersion') IS NULL
    ALTER TABLE dbo.Users ADD TokenVersion int NOT NULL CONSTRAINT DF_Users_TokenVersion DEFAULT 0 WITH VALUES;
IF COL_LENGTH('dbo.Users', 'AvatarStorageKey') IS NULL
    ALTER TABLE dbo.Users ADD AvatarStorageKey varchar(100) NULL;
IF COL_LENGTH('dbo.Users', 'AvatarContentType') IS NULL
    ALTER TABLE dbo.Users ADD AvatarContentType varchar(50) NULL;
IF COL_LENGTH('dbo.Users', 'AvatarUpdatedAt') IS NULL
    ALTER TABLE dbo.Users ADD AvatarUpdatedAt datetime2 NULL;
IF COL_LENGTH('dbo.Users', 'LastReauthenticatedAt') IS NULL
    ALTER TABLE dbo.Users ADD LastReauthenticatedAt datetime2 NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'UX_Users_Phone')
BEGIN
    IF EXISTS
    (
        SELECT Phone FROM dbo.Users WHERE Phone IS NOT NULL
        GROUP BY Phone HAVING COUNT_BIG(*) > 1
    )
        THROW 50002, 'Resolve duplicate phone numbers in dbo.Users before enabling unique phone validation.', 1;
    CREATE UNIQUE INDEX UX_Users_Phone ON dbo.Users(Phone) WHERE Phone IS NOT NULL;
END;

IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens
    (
        RefreshTokenId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY,
        UserId bigint NOT NULL,
        TokenHash varchar(100) NOT NULL,
        ExpiresAt datetime2 NOT NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedByIp varchar(64) NULL,
        DeviceInfo nvarchar(500) NULL,
        RevokedAt datetime2 NULL,
        RevokedByIp varchar(64) NULL,
        ReplacedByTokenHash varchar(100) NULL,
        CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT UQ_RefreshTokens_TokenHash UNIQUE (TokenHash)
    );
    CREATE INDEX IX_RefreshTokens_User_ExpiresAt ON dbo.RefreshTokens(UserId, ExpiresAt);
END;

IF OBJECT_ID('dbo.AuthOtpChallenges', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthOtpChallenges
    (
        ChallengeId uniqueidentifier NOT NULL CONSTRAINT PK_AuthOtpChallenges PRIMARY KEY,
        UserId bigint NULL,
        Channel varchar(20) NOT NULL,
        Purpose varchar(30) NOT NULL,
        Destination nvarchar(255) NOT NULL,
        CodeHash varchar(100) NOT NULL,
        AttemptCount int NOT NULL CONSTRAINT DF_AuthOtpChallenges_AttemptCount DEFAULT 0,
        ExpiresAt datetime2 NOT NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_AuthOtpChallenges_CreatedAt DEFAULT SYSUTCDATETIME(),
        ConsumedAt datetime2 NULL,
        CONSTRAINT FK_AuthOtpChallenges_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT CK_AuthOtpChallenges_Channel CHECK (Channel IN ('Email', 'Phone')),
        CONSTRAINT CK_AuthOtpChallenges_Purpose CHECK (Purpose IN ('Login', 'PasswordReset')),
        CONSTRAINT CK_AuthOtpChallenges_Attempts CHECK (AttemptCount >= 0)
    );
    CREATE INDEX IX_AuthOtpChallenges_Destination_Purpose_CreatedAt
        ON dbo.AuthOtpChallenges(Destination, Purpose, CreatedAt DESC);
END;

IF OBJECT_ID('dbo.ExternalLogins', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExternalLogins
    (
        ExternalLoginId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_ExternalLogins PRIMARY KEY,
        UserId bigint NOT NULL,
        Provider varchar(50) NOT NULL,
        ProviderSubject varchar(255) NOT NULL,
        Email varchar(255) NOT NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_ExternalLogins_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ExternalLogins_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT UQ_ExternalLogins_Provider_Subject UNIQUE (Provider, ProviderSubject)
    );
    CREATE INDEX IX_ExternalLogins_UserId ON dbo.ExternalLogins(UserId);
END;

COMMIT TRANSACTION;
