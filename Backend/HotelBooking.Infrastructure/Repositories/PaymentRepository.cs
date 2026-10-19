using System.Data;
using Dapper;
using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Infrastructure.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly IDbConnection _connection;

    public PaymentRepository(IDbConnection connection)
    {
        _connection = connection;
    }

    public async Task<Payment?> GetByIdAsync(long paymentId)
    {
        const string sql = """
            SELECT
                PaymentId,
                BookingId,
                PaymentMethod,
                PaymentType,
                Amount,
                Status,
                TransactionCode,
                PaidAt,
                CreatedAt
            FROM Payments
            WHERE PaymentId = @PaymentId;
            """;

        return await _connection.QuerySingleOrDefaultAsync<Payment>(
            sql,
            new { PaymentId = paymentId });
    }

    public async Task<IEnumerable<Payment>> GetByBookingIdAsync(
        long bookingId)
    {
        const string sql = """
            SELECT
                PaymentId,
                BookingId,
                PaymentMethod,
                PaymentType,
                Amount,
                Status,
                TransactionCode,
                PaidAt,
                CreatedAt
            FROM Payments
            WHERE BookingId = @BookingId
            ORDER BY CreatedAt DESC;
            """;

        return await _connection.QueryAsync<Payment>(
            sql,
            new { BookingId = bookingId });
    }

    public async Task<long> CreateAsync(Payment payment)
    {
        const string sql = """
            INSERT INTO Payments
            (
                BookingId,
                PaymentMethod,
                PaymentType,
                Amount,
                Status,
                TransactionCode,
                PaidAt,
                CreatedAt
            )
            VALUES
            (
                @BookingId,
                @PaymentMethod,
                @PaymentType,
                @Amount,
                @Status,
                @TransactionCode,
                @PaidAt,
                SYSDATETIME()
            );

            SELECT CAST(SCOPE_IDENTITY() AS BIGINT);
            """;

        return await _connection.ExecuteScalarAsync<long>(
            sql,
            new
            {
                payment.BookingId,
                PaymentMethod = payment.PaymentMethod.ToString(),
                PaymentType = payment.PaymentType.ToString(),
                payment.Amount,
                Status = payment.Status.ToString(),
                payment.TransactionCode,
                payment.PaidAt
            });
    }

    public async Task<bool> UpdateStatusAsync(
        long paymentId,
        string status,
        DateTime? paidAt)
    {
        const string sql = """
            UPDATE Payments
            SET
                Status = @Status,
                PaidAt = @PaidAt
            WHERE PaymentId = @PaymentId;
            """;

        var affectedRows = await _connection.ExecuteAsync(
            sql,
            new
            {
                PaymentId = paymentId,
                Status = status,
                PaidAt = paidAt
            });

        return affectedRows > 0;
    }

    public async Task<decimal> GetTotalPaidAmountAsync(
        long bookingId)
    {
        const string sql = """
            SELECT ISNULL(SUM(Amount), 0)
            FROM Payments
            WHERE BookingId = @BookingId
              AND Status = 'Paid'
              AND PaymentType = 'Payment';
            """;

        return await _connection.ExecuteScalarAsync<decimal>(
            sql,
            new { BookingId = bookingId });
    }

    public async Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(
            long bookingId)
    {
        const string sql = """
            SELECT
                BookingId,
                BookingStatus,
                TotalAmount,
                DepositAmount,
                RemainingAmount
            FROM Bookings
            WHERE BookingId = @BookingId;
            """;

        return await _connection.QuerySingleOrDefaultAsync<BookingPaymentInfo>(
            sql,
            new { BookingId = bookingId });
    }

    public async Task UpdateBookingPaymentSummaryAsync(
        long bookingId,
        decimal totalPaid,
        decimal totalAmount)
    {
        var paymentStatus = totalPaid switch
        {
            <= 0 => "Unpaid",
            var x when x < totalAmount => "PartiallyPaid",
            _ => "Paid"
        };

        var remainingAmount = Math.Max(
            totalAmount - totalPaid,
            0);

        const string sql = """
            DECLARE @OldStatus VARCHAR(20);
            DECLARE @CustomerId BIGINT;

            SELECT @OldStatus = BookingStatus, @CustomerId = CustomerId
            FROM Bookings
            WHERE BookingId = @BookingId;

            IF (@TotalPaid > 0 AND @OldStatus = 'Pending')
            BEGIN
                UPDATE Bookings
                SET
                    BookingStatus = 'Confirmed',
                    PaymentStatus = @PaymentStatus,
                    RemainingAmount = @RemainingAmount,
                    HoldExpiresAt = NULL,
                    UpdatedAt = SYSDATETIME()
                WHERE BookingId = @BookingId;

                INSERT INTO BookingStatusHistory (BookingId, OldStatus, NewStatus, ChangedByUserId, ChangedAt, Note)
                VALUES (@BookingId, 'Pending', 'Confirmed', @CustomerId, SYSDATETIME(), N'Hệ thống tự động xác nhận đơn sau khi thanh toán thành công.');
            END
            ELSE
            BEGIN
                UPDATE Bookings
                SET
                    PaymentStatus = @PaymentStatus,
                    RemainingAmount = @RemainingAmount,
                    UpdatedAt = SYSDATETIME()
                WHERE BookingId = @BookingId;
            END
            """;

        await _connection.ExecuteAsync(
            sql,
            new
            {
                BookingId = bookingId,
                PaymentStatus = paymentStatus,
                RemainingAmount = remainingAmount,
                TotalPaid = totalPaid
            });
    }

    public async Task<BookingCustomerAccessInfo?> GetBookingCustomerAccessInfoAsync(long bookingId)
    {
        const string sql = """
            SELECT
                BookingId,
                CustomerId,
                BookingStatus
            FROM Bookings
            WHERE BookingId = @BookingId;
            """;

        return await _connection.QuerySingleOrDefaultAsync<BookingCustomerAccessInfo>(
            sql,
            new { BookingId = bookingId });
    }

    public async Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM BookingDetails bd
                INNER JOIN Rooms r ON bd.RoomId = r.RoomId
                INNER JOIN StaffAreaAssignments saa ON r.AreaId = saa.AreaId
                WHERE bd.BookingId = @BookingId
                  AND saa.UserId = @StaffUserId
                  AND saa.IsActive = 1
            ) THEN 1 ELSE 0 END;
            """;

        return await _connection.ExecuteScalarAsync<bool>(
            sql,
            new { BookingId = bookingId, StaffUserId = staffUserId });
    }

    public async Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetCustomerPaymentHistoryAsync(
        long customerId,
        int page,
        int pageSize)
    {
        const string countSql = """
            SELECT COUNT(1)
            FROM Payments p
            INNER JOIN Bookings b ON p.BookingId = b.BookingId
            WHERE b.CustomerId = @CustomerId;
            """;

        var totalCount = await _connection.ExecuteScalarAsync<int>(
            countSql,
            new { CustomerId = customerId });

        if (totalCount == 0)
        {
            return (Array.Empty<PaymentHistoryDto>(), 0);
        }

        const string dataSql = """
            SELECT
                p.PaymentId,
                p.BookingId,
                b.BookingCode,
                b.CustomerId,
                u.FullName AS CustomerName,
                u.Email AS CustomerEmail,
                p.Amount,
                p.PaymentMethod,
                p.PaymentType,
                p.Status,
                p.TransactionCode,
                p.CreatedAt,
                p.PaidAt
            FROM Payments p
            INNER JOIN Bookings b ON p.BookingId = b.BookingId
            INNER JOIN Users u ON b.CustomerId = u.UserId
            WHERE b.CustomerId = @CustomerId
            ORDER BY p.CreatedAt DESC, p.PaymentId DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            """;

        var offset = (page - 1) * pageSize;
        var items = await _connection.QueryAsync<PaymentHistoryDto>(
            dataSql,
            new { CustomerId = customerId, Offset = offset, PageSize = pageSize });

        return (items.ToList(), totalCount);
    }

    public async Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetBookingPaymentHistoryAsync(
        long bookingId,
        int page,
        int pageSize)
    {
        const string countSql = """
            SELECT COUNT(1)
            FROM Payments p
            WHERE p.BookingId = @BookingId;
            """;

        var totalCount = await _connection.ExecuteScalarAsync<int>(
            countSql,
            new { BookingId = bookingId });

        if (totalCount == 0)
        {
            return (Array.Empty<PaymentHistoryDto>(), 0);
        }

        const string dataSql = """
            SELECT
                p.PaymentId,
                p.BookingId,
                b.BookingCode,
                b.CustomerId,
                u.FullName AS CustomerName,
                u.Email AS CustomerEmail,
                p.Amount,
                p.PaymentMethod,
                p.PaymentType,
                p.Status,
                p.TransactionCode,
                p.CreatedAt,
                p.PaidAt
            FROM Payments p
            INNER JOIN Bookings b ON p.BookingId = b.BookingId
            INNER JOIN Users u ON b.CustomerId = u.UserId
            WHERE p.BookingId = @BookingId
            ORDER BY p.CreatedAt DESC, p.PaymentId DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            """;

        var offset = (page - 1) * pageSize;
        var items = await _connection.QueryAsync<PaymentHistoryDto>(
            dataSql,
            new { BookingId = bookingId, Offset = offset, PageSize = pageSize });

        return (items.ToList(), totalCount);
    }

    public async Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetStaffPaymentHistoryAsync(
        PaymentHistoryFilterRequest filter,
        long staffUserId,
        bool isAdmin)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!isAdmin)
        {
            conditions.Add("""
                EXISTS (
                    SELECT 1
                    FROM BookingDetails bd
                    INNER JOIN Rooms r ON bd.RoomId = r.RoomId
                    INNER JOIN StaffAreaAssignments saa ON r.AreaId = saa.AreaId
                    WHERE bd.BookingId = p.BookingId
                      AND saa.UserId = @StaffUserId
                      AND saa.IsActive = 1
                )
                """);
            parameters.Add("StaffUserId", staffUserId);
        }

        if (filter.BookingId.HasValue)
        {
            conditions.Add("p.BookingId = @BookingId");
            parameters.Add("BookingId", filter.BookingId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            conditions.Add("p.Status = @Status");
            parameters.Add("Status", filter.Status.Trim());
        }

        if (filter.FromDate.HasValue)
        {
            conditions.Add("p.CreatedAt >= @FromDate");
            parameters.Add("FromDate", filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            conditions.Add("p.CreatedAt <= @ToDate");
            parameters.Add("ToDate", filter.ToDate.Value);
        }

        var whereClause = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";

        var countSql = $"""
            SELECT COUNT(1)
            FROM Payments p
            INNER JOIN Bookings b ON p.BookingId = b.BookingId
            {whereClause};
            """;

        var totalCount = await _connection.ExecuteScalarAsync<int>(countSql, parameters);

        if (totalCount == 0)
        {
            return (Array.Empty<PaymentHistoryDto>(), 0);
        }

        var dataSql = $"""
            SELECT
                p.PaymentId,
                p.BookingId,
                b.BookingCode,
                b.CustomerId,
                u.FullName AS CustomerName,
                u.Email AS CustomerEmail,
                p.Amount,
                p.PaymentMethod,
                p.PaymentType,
                p.Status,
                p.TransactionCode,
                p.CreatedAt,
                p.PaidAt
            FROM Payments p
            INNER JOIN Bookings b ON p.BookingId = b.BookingId
            INNER JOIN Users u ON b.CustomerId = u.UserId
            {whereClause}
            ORDER BY p.CreatedAt DESC, p.PaymentId DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            """;

        var offset = (filter.Page - 1) * filter.PageSize;
        parameters.Add("Offset", offset);
        parameters.Add("PageSize", filter.PageSize);

        var items = await _connection.QueryAsync<PaymentHistoryDto>(dataSql, parameters);
        return (items.ToList(), totalCount);
    }
}