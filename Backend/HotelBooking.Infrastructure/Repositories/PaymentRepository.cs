using System.Data;
using Dapper;
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

    public async Task<Payment?> GetByIdAsync(Guid paymentId)
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
        Guid bookingId)
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

    public async Task<Guid> CreateAsync(Payment payment)
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

        return await _connection.ExecuteScalarAsync<Guid>(
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
        Guid paymentId,
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
        Guid     bookingId)
    {
        const string sql = """
            SELECT ISNULL(SUM(Amount), 0)
            FROM Payments
            WHERE BookingId = @BookingId
              AND Status = 'Paid'
              AND PaymentType IN ('Deposit', 'Payment');
            """;

        return await _connection.ExecuteScalarAsync<decimal>(
            sql,
            new { BookingId = bookingId });
    }

    public async Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(
            Guid bookingId)
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
        Guid bookingId,
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
            UPDATE Bookings
            SET
                PaymentStatus = @PaymentStatus,
                RemainingAmount = @RemainingAmount,
                DepositAmount =
                    CASE
                        WHEN @TotalPaid > 0
                        THEN @TotalPaid
                        ELSE 0
                    END,
                UpdatedAt = SYSDATETIME()
            WHERE BookingId = @BookingId;
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
}