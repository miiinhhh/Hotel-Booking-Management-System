/* =========================================================
   HOTEL BOOKING MANAGEMENT SYSTEM
   SQL SERVER DATABASE
   UPDATED VERSION
   Supports:
   - Multiple hotels
   - Zone / Building management
   - Staff area assignment
   - Deposit / Cash-at-check-in payment
   - Voucher / Coupon
   - Cancellation policies
   - Booking hold 10-15 minutes
   ========================================================= */

-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE Users
(
    UserId BIGINT IDENTITY(1,1) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Phone VARCHAR(20) NULL,
    DateOfBirth DATE NULL,
    IsActive BIT NOT NULL
        CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Users_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);

-- =========================================================
-- 2. ROLES
-- =========================================================

CREATE TABLE Roles
(
    RoleId INT IDENTITY(1,1) NOT NULL,
    RoleName VARCHAR(50) NOT NULL,
    Description NVARCHAR(255) NULL,

    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
);

-- =========================================================
-- 3. USER_ROLES
-- =========================================================

CREATE TABLE UserRoles
(
    UserId BIGINT NOT NULL,
    RoleId INT NOT NULL,
    AssignedAt DATETIME2 NOT NULL
        CONSTRAINT DF_UserRoles_AssignedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId),

    CONSTRAINT FK_UserRoles_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE,

    CONSTRAINT FK_UserRoles_Role
        FOREIGN KEY (RoleId)
        REFERENCES Roles(RoleId)
        ON DELETE CASCADE
);

-- =========================================================
-- 4. HOTELS
-- =========================================================

CREATE TABLE Hotels
(
    HotelId INT IDENTITY(1,1) NOT NULL,
    HotelName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Address NVARCHAR(300) NOT NULL,
    City NVARCHAR(100) NOT NULL,
    Country NVARCHAR(100) NOT NULL
        CONSTRAINT DF_Hotels_Country DEFAULT N'Vietnam',
    Phone VARCHAR(20) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Website VARCHAR(500) NULL,
    CheckInTime TIME NOT NULL,
    CheckOutTime TIME NOT NULL,
    IsActive BIT NOT NULL
        CONSTRAINT DF_Hotels_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Hotels_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Hotels PRIMARY KEY (HotelId),

    CONSTRAINT CK_Hotels_CheckInOut
        CHECK (CheckOutTime <> CheckInTime)
);

-- =========================================================
-- 5. HOTEL_AREAS
-- Zone / Building inside a hotel
-- =========================================================

CREATE TABLE HotelAreas
(
    AreaId INT IDENTITY(1,1) NOT NULL,
    HotelId INT NOT NULL,
    AreaName NVARCHAR(150) NOT NULL,
    AreaType VARCHAR(20) NOT NULL,
    ParentAreaId INT NULL,
    Description NVARCHAR(500) NULL,
    LocationDescription NVARCHAR(500) NULL,
    FloorCount INT NULL,
    IsActive BIT NOT NULL
        CONSTRAINT DF_HotelAreas_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_HotelAreas_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_HotelAreas PRIMARY KEY (AreaId),

    CONSTRAINT FK_HotelAreas_Hotel
        FOREIGN KEY (HotelId)
        REFERENCES Hotels(HotelId),

    CONSTRAINT FK_HotelAreas_Parent
        FOREIGN KEY (ParentAreaId)
        REFERENCES HotelAreas(AreaId),

    CONSTRAINT CK_HotelAreas_Type
        CHECK (AreaType IN ('Zone', 'Building')),

    CONSTRAINT CK_HotelAreas_FloorCount
        CHECK (FloorCount IS NULL OR FloorCount > 0),

    CONSTRAINT UQ_HotelAreas_Name
        UNIQUE (HotelId, AreaName)
);

-- =========================================================
-- 6. STAFF_AREA_ASSIGNMENTS
-- Assign Staff to one or more Zone / Building
-- =========================================================

CREATE TABLE StaffAreaAssignments
(
    AssignmentId BIGINT IDENTITY(1,1) NOT NULL,
    UserId BIGINT NOT NULL,
    AreaId INT NOT NULL,
    AssignedAt DATETIME2 NOT NULL
        CONSTRAINT DF_StaffAreaAssignments_AssignedAt
        DEFAULT SYSDATETIME(),
    AssignedByUserId BIGINT NULL,
    IsActive BIT NOT NULL
        CONSTRAINT DF_StaffAreaAssignments_IsActive DEFAULT 1,

    CONSTRAINT PK_StaffAreaAssignments PRIMARY KEY (AssignmentId),

    CONSTRAINT FK_StaffAreaAssignments_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_StaffAreaAssignments_Area
        FOREIGN KEY (AreaId)
        REFERENCES HotelAreas(AreaId),

    CONSTRAINT FK_StaffAreaAssignments_AssignedBy
        FOREIGN KEY (AssignedByUserId)
        REFERENCES Users(UserId),

    CONSTRAINT UQ_StaffAreaAssignments
        UNIQUE (UserId, AreaId)
);

-- =========================================================
-- 7. AMENITIES
-- =========================================================

CREATE TABLE Amenities
(
    AmenityId INT IDENTITY(1,1) NOT NULL,
    AmenityName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255) NULL,
    IsActive BIT NOT NULL
        CONSTRAINT DF_Amenities_IsActive DEFAULT 1,

    CONSTRAINT PK_Amenities PRIMARY KEY (AmenityId),
    CONSTRAINT UQ_Amenities_Name UNIQUE (AmenityName)
);

-- =========================================================
-- 8. HOTEL_AMENITIES
-- =========================================================

CREATE TABLE HotelAmenities
(
    HotelId INT NOT NULL,
    AmenityId INT NOT NULL,

    CONSTRAINT PK_HotelAmenities PRIMARY KEY (HotelId, AmenityId),

    CONSTRAINT FK_HotelAmenities_Hotel
        FOREIGN KEY (HotelId)
        REFERENCES Hotels(HotelId)
        ON DELETE CASCADE,

    CONSTRAINT FK_HotelAmenities_Amenity
        FOREIGN KEY (AmenityId)
        REFERENCES Amenities(AmenityId)
        ON DELETE CASCADE
);

-- =========================================================
-- 9. HOTEL_IMAGES
-- =========================================================

CREATE TABLE HotelImages
(
    HotelImageId BIGINT IDENTITY(1,1) NOT NULL,
    HotelId INT NOT NULL,
    ImageUrl VARCHAR(1000) NOT NULL,
    AltText NVARCHAR(255) NULL,
    DisplayOrder INT NOT NULL
        CONSTRAINT DF_HotelImages_DisplayOrder DEFAULT 0,
    IsPrimary BIT NOT NULL
        CONSTRAINT DF_HotelImages_IsPrimary DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_HotelImages_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_HotelImages PRIMARY KEY (HotelImageId),

    CONSTRAINT FK_HotelImages_Hotel
        FOREIGN KEY (HotelId)
        REFERENCES Hotels(HotelId)
        ON DELETE CASCADE,

    CONSTRAINT CK_HotelImages_DisplayOrder
        CHECK (DisplayOrder >= 0)
);

-- =========================================================
-- 10. ROOM_TYPES
-- =========================================================

CREATE TABLE RoomTypes
(
    RoomTypeId INT IDENTITY(1,1) NOT NULL,
    HotelId INT NOT NULL,
    AreaId INT NOT NULL,
    RoomTypeName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    BasePrice DECIMAL(18,2) NOT NULL,
    Capacity INT NOT NULL,
    NumberOfBeds INT NOT NULL
        CONSTRAINT DF_RoomTypes_NumberOfBeds DEFAULT 1,
    IsActive BIT NOT NULL
        CONSTRAINT DF_RoomTypes_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_RoomTypes_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_RoomTypes PRIMARY KEY (RoomTypeId),

    CONSTRAINT FK_RoomTypes_Hotel
        FOREIGN KEY (HotelId)
        REFERENCES Hotels(HotelId),

    CONSTRAINT FK_RoomTypes_Area
        FOREIGN KEY (AreaId)
        REFERENCES HotelAreas(AreaId),

    CONSTRAINT CK_RoomTypes_BasePrice
        CHECK (BasePrice >= 0),

    CONSTRAINT CK_RoomTypes_Capacity
        CHECK (Capacity > 0),

    CONSTRAINT CK_RoomTypes_NumberOfBeds
        CHECK (NumberOfBeds > 0),

    CONSTRAINT UQ_RoomTypes_Hotel_Area_Name
        UNIQUE (HotelId, AreaId, RoomTypeName)
);

-- =========================================================
-- 11. ROOM_PRICE_HISTORY
-- =========================================================

CREATE TABLE RoomPriceHistory
(
    PriceHistoryId BIGINT IDENTITY(1,1) NOT NULL,
    RoomTypeId INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    EffectiveFrom DATETIME2 NOT NULL,
    EffectiveTo DATETIME2 NULL,
    ChangedByUserId BIGINT NOT NULL,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_RoomPriceHistory_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_RoomPriceHistory PRIMARY KEY (PriceHistoryId),

    CONSTRAINT FK_RoomPriceHistory_RoomType
        FOREIGN KEY (RoomTypeId)
        REFERENCES RoomTypes(RoomTypeId),

    CONSTRAINT FK_RoomPriceHistory_User
        FOREIGN KEY (ChangedByUserId)
        REFERENCES Users(UserId),

    CONSTRAINT CK_RoomPriceHistory_Price
        CHECK (Price >= 0),

    CONSTRAINT CK_RoomPriceHistory_DateRange
        CHECK (
            EffectiveTo IS NULL
            OR EffectiveTo > EffectiveFrom
        )
);

-- =========================================================
-- 12. ROOMS
-- =========================================================

CREATE TABLE Rooms
(
    RoomId BIGINT IDENTITY(1,1) NOT NULL,
    RoomTypeId INT NOT NULL,
    AreaId INT NOT NULL,
    RoomNumber VARCHAR(20) NOT NULL,
    Floor INT NOT NULL,
    Status VARCHAR(20) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL
        CONSTRAINT DF_Rooms_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Rooms_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Rooms PRIMARY KEY (RoomId),

    CONSTRAINT UQ_Rooms_Area_RoomNumber
        UNIQUE (AreaId, RoomNumber),

    CONSTRAINT FK_Rooms_RoomType
        FOREIGN KEY (RoomTypeId)
        REFERENCES RoomTypes(RoomTypeId),

    CONSTRAINT FK_Rooms_Area
        FOREIGN KEY (AreaId)
        REFERENCES HotelAreas(AreaId),

    CONSTRAINT CK_Rooms_Floor
        CHECK (Floor >= 0),

    CONSTRAINT CK_Rooms_Status
        CHECK (
            Status IN
            (
                'Available',
                'Occupied',
                'Maintenance',
                'Inactive'
            )
        )
);

-- =========================================================
-- 13. ROOM_AMENITIES
-- =========================================================

CREATE TABLE RoomAmenities
(
    RoomId BIGINT NOT NULL,
    AmenityId INT NOT NULL,

    CONSTRAINT PK_RoomAmenities PRIMARY KEY (RoomId, AmenityId),

    CONSTRAINT FK_RoomAmenities_Room
        FOREIGN KEY (RoomId)
        REFERENCES Rooms(RoomId)
        ON DELETE CASCADE,

    CONSTRAINT FK_RoomAmenities_Amenity
        FOREIGN KEY (AmenityId)
        REFERENCES Amenities(AmenityId)
        ON DELETE CASCADE
);

-- =========================================================
-- 14. ROOM_IMAGES
-- =========================================================

CREATE TABLE RoomImages
(
    RoomImageId BIGINT IDENTITY(1,1) NOT NULL,
    RoomId BIGINT NOT NULL,
    ImageUrl VARCHAR(1000) NOT NULL,
    AltText NVARCHAR(255) NULL,
    DisplayOrder INT NOT NULL
        CONSTRAINT DF_RoomImages_DisplayOrder DEFAULT 0,
    IsPrimary BIT NOT NULL
        CONSTRAINT DF_RoomImages_IsPrimary DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_RoomImages_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_RoomImages PRIMARY KEY (RoomImageId),

    CONSTRAINT FK_RoomImages_Room
        FOREIGN KEY (RoomId)
        REFERENCES Rooms(RoomId)
        ON DELETE CASCADE,

    CONSTRAINT CK_RoomImages_DisplayOrder
        CHECK (DisplayOrder >= 0)
);

-- =========================================================
-- 15. BOOKINGS
-- =========================================================

CREATE TABLE Bookings
(
    BookingId BIGINT IDENTITY(1,1) NOT NULL,
    BookingCode VARCHAR(30) NOT NULL,
    CustomerId BIGINT NOT NULL,

    CheckInDate DATE NOT NULL,
    CheckOutDate DATE NOT NULL,
    NumberOfGuests INT NOT NULL,

    BookingStatus VARCHAR(20) NOT NULL,
    PaymentMethod VARCHAR(20) NOT NULL,
    PaymentStatus VARCHAR(20) NOT NULL,

    SubTotal DECIMAL(18,2) NOT NULL,
    TaxAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Bookings_TaxAmount DEFAULT 0,
    FeeAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Bookings_FeeAmount DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Bookings_DiscountAmount DEFAULT 0,

    TotalAmount DECIMAL(18,2) NOT NULL,

    DepositAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Bookings_DepositAmount DEFAULT 0,
    RemainingAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Bookings_RemainingAmount DEFAULT 0,

    VoucherId BIGINT NULL,

    SpecialRequests NVARCHAR(1000) NULL,

    HoldExpiresAt DATETIME2 NULL,

    CancellationReason NVARCHAR(500) NULL,
    CancelledAt DATETIME2 NULL,

    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Bookings_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Bookings PRIMARY KEY (BookingId),

    CONSTRAINT UQ_Bookings_BookingCode
        UNIQUE (BookingCode),

    CONSTRAINT FK_Bookings_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_Bookings_Voucher
        FOREIGN KEY (VoucherId)
        REFERENCES Vouchers(VoucherId),

    CONSTRAINT CK_Bookings_DateRange
        CHECK (CheckOutDate > CheckInDate),

    CONSTRAINT CK_Bookings_Guests
        CHECK (NumberOfGuests > 0),

    CONSTRAINT CK_Bookings_BookingStatus
        CHECK (
            BookingStatus IN
            (
                'Pending',
                'Confirmed',
                'CheckedIn',
                'CheckedOut',
                'Completed',
                'Cancelled',
                'Expired'
            )
        ),

    CONSTRAINT CK_Bookings_PaymentMethod
        CHECK (
            PaymentMethod IN
            (
                'Deposit',
                'Cash'
            )
        ),

    CONSTRAINT CK_Bookings_PaymentStatus
        CHECK (
            PaymentStatus IN
            (
                'Unpaid',
                'PartiallyPaid',
                'Paid',
                'Refunded'
            )
        ),

    CONSTRAINT CK_Bookings_Amounts
        CHECK (
            SubTotal >= 0
            AND TaxAmount >= 0
            AND FeeAmount >= 0
            AND DiscountAmount >= 0
            AND TotalAmount >= 0
            AND DepositAmount >= 0
            AND RemainingAmount >= 0
        )
);

-- =========================================================
-- 16. BOOKING_DETAILS
-- =========================================================

CREATE TABLE BookingDetails
(
    BookingDetailId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,
    RoomId BIGINT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    NumberOfNights INT NOT NULL,
    SubTotal DECIMAL(18,2) NOT NULL,

    CONSTRAINT PK_BookingDetails PRIMARY KEY (BookingDetailId),

    CONSTRAINT FK_BookingDetails_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Bookings(BookingId)
        ON DELETE CASCADE,

    CONSTRAINT FK_BookingDetails_Room
        FOREIGN KEY (RoomId)
        REFERENCES Rooms(RoomId),

    CONSTRAINT CK_BookingDetails_UnitPrice
        CHECK (UnitPrice >= 0),

    CONSTRAINT CK_BookingDetails_Nights
        CHECK (NumberOfNights > 0),

    CONSTRAINT CK_BookingDetails_SubTotal
        CHECK (SubTotal >= 0)
);

-- =========================================================
-- 17. BOOKING_GUESTS
-- =========================================================

CREATE TABLE BookingGuests
(
    BookingGuestId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    Phone VARCHAR(20) NULL,
    Email VARCHAR(255) NULL,
    IsPrimaryGuest BIT NOT NULL
        CONSTRAINT DF_BookingGuests_IsPrimary DEFAULT 0,

    CONSTRAINT PK_BookingGuests PRIMARY KEY (BookingGuestId),

    CONSTRAINT FK_BookingGuests_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Bookings(BookingId)
        ON DELETE CASCADE
);

-- =========================================================
-- 18. BOOKING_STATUS_HISTORY
-- =========================================================

CREATE TABLE BookingStatusHistory
(
    BookingStatusHistoryId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,
    OldStatus VARCHAR(20) NULL,
    NewStatus VARCHAR(20) NOT NULL,
    ChangedByUserId BIGINT NULL,
    ChangedAt DATETIME2 NOT NULL
        CONSTRAINT DF_BookingStatusHistory_ChangedAt
        DEFAULT SYSDATETIME(),
    Note NVARCHAR(500) NULL,

    CONSTRAINT PK_BookingStatusHistory
        PRIMARY KEY (BookingStatusHistoryId),

    CONSTRAINT FK_BookingStatusHistory_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Bookings(BookingId)
        ON DELETE CASCADE,

    CONSTRAINT FK_BookingStatusHistory_User
        FOREIGN KEY (ChangedByUserId)
        REFERENCES Users(UserId),

    CONSTRAINT CK_BookingStatusHistory_NewStatus
        CHECK (
            NewStatus IN
            (
                'Pending',
                'Confirmed',
                'CheckedIn',
                'CheckedOut',
                'Completed',
                'Cancelled',
                'Expired'
            )
        )
);

-- =========================================================
-- 19. PAYMENTS
-- =========================================================

CREATE TABLE Payments
(
    PaymentId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,

    PaymentMethod VARCHAR(20) NOT NULL,
    PaymentType VARCHAR(20) NOT NULL,

    Amount DECIMAL(18,2) NOT NULL,
    Status VARCHAR(20) NOT NULL,

    TransactionCode VARCHAR(150) NULL,
    PaidAt DATETIME2 NULL,

    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Payments PRIMARY KEY (PaymentId),

    CONSTRAINT FK_Payments_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Bookings(BookingId),

    CONSTRAINT CK_Payments_Method
        CHECK (
            PaymentMethod IN
            (
                'Deposit',
                'Cash'
            )
        ),

    CONSTRAINT CK_Payments_Type
        CHECK (
            PaymentType IN
            (
                'Payment',
                'Refund'
            )
        ),

    CONSTRAINT CK_Payments_Status
        CHECK (
            Status IN
            (
                'Pending',
                'Paid',
                'Failed',
                'Refunded'
            )
        ),

    CONSTRAINT CK_Payments_Amount
        CHECK (Amount > 0),

    CONSTRAINT UQ_Payments_TransactionCode
        UNIQUE (TransactionCode)
);

-- =========================================================
-- 20. REVIEWS
-- =========================================================

CREATE TABLE Reviews
(
    ReviewId BIGINT IDENTITY(1,1) NOT NULL,
    BookingId BIGINT NOT NULL,
    CustomerId BIGINT NOT NULL,
    Rating TINYINT NOT NULL,
    Comment NVARCHAR(2000) NULL,
    Status VARCHAR(20) NOT NULL
        CONSTRAINT DF_Reviews_Status DEFAULT 'Visible',
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Reviews_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Reviews PRIMARY KEY (ReviewId),

    CONSTRAINT UQ_Reviews_BookingId
        UNIQUE (BookingId),

    CONSTRAINT FK_Reviews_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Bookings(BookingId),

    CONSTRAINT FK_Reviews_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT CK_Reviews_Rating
        CHECK (Rating BETWEEN 1 AND 5),

    CONSTRAINT CK_Reviews_Status
        CHECK (
            Status IN
            (
                'Visible',
                'Hidden',
                'Deleted'
            )
        )
);

-- =========================================================
-- 21. NOTIFICATIONS
-- =========================================================

CREATE TABLE Notifications
(
    NotificationId BIGINT IDENTITY(1,1) NOT NULL,
    UserId BIGINT NOT NULL,
    BookingId BIGINT NULL,
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    Type VARCHAR(50) NOT NULL,
    IsRead BIT NOT NULL
        CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSDATETIME(),
    ReadAt DATETIME2 NULL,

    CONSTRAINT PK_Notifications
        PRIMARY KEY (NotificationId),

    CONSTRAINT FK_Notifications_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE,

    CONSTRAINT FK_Notifications_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Bookings(BookingId)
);

-- =========================================================
-- 22. VOUCHERS
-- =========================================================

CREATE TABLE Vouchers
(
    VoucherId BIGINT IDENTITY(1,1) NOT NULL,
    Code VARCHAR(50) NOT NULL,
    VoucherType VARCHAR(20) NOT NULL,
    DiscountValue DECIMAL(18,2) NOT NULL,
    MinimumOrderAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_Vouchers_MinimumOrderAmount DEFAULT 0,
    StartAt DATETIME2 NOT NULL,
    EndAt DATETIME2 NOT NULL,
    UsageLimit INT NULL,
    UsedCount INT NOT NULL
        CONSTRAINT DF_Vouchers_UsedCount DEFAULT 0,
    IsActive BIT NOT NULL
        CONSTRAINT DF_Vouchers_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_Vouchers_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_Vouchers PRIMARY KEY (VoucherId),

    CONSTRAINT UQ_Vouchers_Code UNIQUE (Code),

    CONSTRAINT CK_Vouchers_Type
        CHECK (
            VoucherType IN
            (
                'Percentage',
                'FixedAmount'
            )
        ),

    CONSTRAINT CK_Vouchers_Value
        CHECK (DiscountValue > 0),

    CONSTRAINT CK_Vouchers_Date
        CHECK (EndAt > StartAt),

    CONSTRAINT CK_Vouchers_Usage
        CHECK (UsageLimit IS NULL OR UsageLimit > 0),

    CONSTRAINT CK_Vouchers_UsedCount
        CHECK (UsedCount >= 0)
);

-- =========================================================
-- 23. CANCELLATION_POLICIES
-- =========================================================

CREATE TABLE CancellationPolicies
(
    CancellationPolicyId INT IDENTITY(1,1) NOT NULL,
    HotelId INT NOT NULL,

    PolicyName NVARCHAR(150) NOT NULL,
    DaysBeforeCheckIn INT NOT NULL,

    RefundPercentage DECIMAL(5,2) NOT NULL,
    DepositPenaltyPercentage DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_CancellationPolicies_DepositPenalty
        DEFAULT 0,

    IsActive BIT NOT NULL
        CONSTRAINT DF_CancellationPolicies_IsActive DEFAULT 1,

    CreatedAt DATETIME2 NOT NULL
        CONSTRAINT DF_CancellationPolicies_CreatedAt
        DEFAULT SYSDATETIME(),

    UpdatedAt DATETIME2 NULL,

    CONSTRAINT PK_CancellationPolicies
        PRIMARY KEY (CancellationPolicyId),

    CONSTRAINT FK_CancellationPolicies_Hotel
        FOREIGN KEY (HotelId)
        REFERENCES Hotels(HotelId),

    CONSTRAINT CK_CancellationPolicies_Days
        CHECK (DaysBeforeCheckIn >= 0),

    CONSTRAINT CK_CancellationPolicies_Refund
        CHECK (RefundPercentage BETWEEN 0 AND 100),

    CONSTRAINT CK_CancellationPolicies_Penalty
        CHECK (DepositPenaltyPercentage BETWEEN 0 AND 100)
);

-- =========================================================
-- INDEXES
-- =========================================================

-- Authentication
CREATE INDEX IX_UserRoles_RoleId
ON UserRoles(RoleId);

-- Hotel / Area
CREATE INDEX IX_HotelAreas_HotelId
ON HotelAreas(HotelId);

CREATE INDEX IX_HotelAreas_ParentAreaId
ON HotelAreas(ParentAreaId);

CREATE INDEX IX_StaffAreaAssignments_UserId
ON StaffAreaAssignments(UserId);

CREATE INDEX IX_StaffAreaAssignments_AreaId
ON StaffAreaAssignments(AreaId);

CREATE INDEX IX_HotelAmenities_AmenityId
ON HotelAmenities(AmenityId);

CREATE INDEX IX_HotelImages_HotelId
ON HotelImages(HotelId);

-- Room
CREATE INDEX IX_RoomTypes_HotelId
ON RoomTypes(HotelId);

CREATE INDEX IX_RoomTypes_AreaId
ON RoomTypes(AreaId);

CREATE INDEX IX_RoomPriceHistory_RoomTypeId
ON RoomPriceHistory(RoomTypeId);

CREATE INDEX IX_RoomPriceHistory_ChangedByUserId
ON RoomPriceHistory(ChangedByUserId);

CREATE INDEX IX_Rooms_RoomTypeId
ON Rooms(RoomTypeId);

CREATE INDEX IX_Rooms_AreaId
ON Rooms(AreaId);

CREATE INDEX IX_Rooms_Status
ON Rooms(Status);

CREATE INDEX IX_RoomAmenities_AmenityId
ON RoomAmenities(AmenityId);

CREATE INDEX IX_RoomImages_RoomId
ON RoomImages(RoomId);

-- Booking
CREATE INDEX IX_Bookings_CustomerId
ON Bookings(CustomerId);

CREATE INDEX IX_Bookings_CheckInDate_CheckOutDate
ON Bookings(CheckInDate, CheckOutDate);

CREATE INDEX IX_Bookings_Status
ON Bookings(BookingStatus);

CREATE INDEX IX_Bookings_PaymentStatus
ON Bookings(PaymentStatus);

CREATE INDEX IX_Bookings_HoldExpiresAt
ON Bookings(HoldExpiresAt);

CREATE INDEX IX_Bookings_VoucherId
ON Bookings(VoucherId);

CREATE INDEX IX_BookingDetails_BookingId
ON BookingDetails(BookingId);

CREATE INDEX IX_BookingDetails_RoomId
ON BookingDetails(RoomId);

CREATE INDEX IX_BookingGuests_BookingId
ON BookingGuests(BookingId);

CREATE INDEX IX_BookingStatusHistory_BookingId
ON BookingStatusHistory(BookingId);

CREATE INDEX IX_BookingStatusHistory_ChangedByUserId
ON BookingStatusHistory(ChangedByUserId);

-- Payment
CREATE INDEX IX_Payments_BookingId
ON Payments(BookingId);

CREATE INDEX IX_Payments_Status
ON Payments(Status);

-- Voucher
CREATE INDEX IX_Vouchers_Active_Date
ON Vouchers(IsActive, StartAt, EndAt);

-- Cancellation
CREATE INDEX IX_CancellationPolicies_HotelId
ON CancellationPolicies(HotelId);

-- Review
CREATE INDEX IX_Reviews_CustomerId
ON Reviews(CustomerId);

-- Notification
CREATE INDEX IX_Notifications_UserId_IsRead
ON Notifications(UserId, IsRead);

CREATE INDEX IX_Notifications_BookingId
ON Notifications(BookingId);
