using System.Security.Claims;
using HotelBooking.Application.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[RequirePermission(SystemPermissions.AccountsManage)]
public sealed class AdminUsersController(IPermissionManagementService service) : ControllerBase
{
    private long ActorId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> List(CancellationToken ct) => Ok(await service.Users(ct));

    [HttpPut("{userId:long:min(1)}")]
    public async Task<ActionResult<AdminUserResponse>> Update(long userId, UpdateAdminUserRequest request, CancellationToken ct) =>
        Ok(await service.UpdateUser(userId, request, ct));

    /// <summary>Hồ sơ khách hàng: đơn đặt phòng, giao dịch, đánh giá và khách sạn yêu thích (tối đa 50 mục mỗi loại).</summary>
    [HttpGet("{userId:long:min(1)}/overview")]
    public async Task<IActionResult> Overview(long userId, [FromServices] System.Data.IDbConnection db, CancellationToken ct)
    {
        const string sql = """
            SELECT TOP 50 b.BookingId, b.BookingCode, b.CheckInDate, b.CheckOutDate, b.BookingStatus, b.PaymentStatus,
                   b.TotalAmount, b.RemainingAmount, b.CreatedAt,
                   (SELECT TOP 1 h.HotelName FROM BookingDetails d JOIN Rooms r ON r.RoomId = d.RoomId
                      JOIN RoomTypes t ON t.RoomTypeId = r.RoomTypeId JOIN Hotels h ON h.HotelId = t.HotelId
                    WHERE d.BookingId = b.BookingId) AS HotelName
            FROM Bookings b WHERE b.CustomerId = @UserId ORDER BY b.CreatedAt DESC;

            SELECT TOP 50 p.PaymentId, b.BookingCode, p.PaymentMethod, p.PaymentType, p.Amount, p.Status, p.TransactionCode, p.PaidAt, p.CreatedAt
            FROM Payments p JOIN Bookings b ON b.BookingId = p.BookingId
            WHERE b.CustomerId = @UserId ORDER BY COALESCE(p.PaidAt, p.CreatedAt) DESC;

            SELECT TOP 50 rv.ReviewId, b.BookingCode, rv.Rating, rv.Comment, rv.Status, rv.CreatedAt,
                   (SELECT TOP 1 h.HotelName FROM BookingDetails d JOIN Rooms r ON r.RoomId = d.RoomId
                      JOIN RoomTypes t ON t.RoomTypeId = r.RoomTypeId JOIN Hotels h ON h.HotelId = t.HotelId
                    WHERE d.BookingId = rv.BookingId) AS HotelName
            FROM Reviews rv JOIN Bookings b ON b.BookingId = rv.BookingId
            WHERE rv.CustomerId = @UserId ORDER BY rv.CreatedAt DESC;

            SELECT TOP 50 w.HotelId, h.HotelName, h.City, w.CreatedAt
            FROM HotelWishlists w JOIN Hotels h ON h.HotelId = w.HotelId
            WHERE w.UserId = @UserId ORDER BY w.CreatedAt DESC;
            """;
        using var grid = await Dapper.SqlMapper.QueryMultipleAsync(db, new Dapper.CommandDefinition(sql, new { UserId = userId }, cancellationToken: ct));
        var bookings = (await grid.ReadAsync()).ToList();
        var payments = (await grid.ReadAsync()).ToList();
        var reviews = (await grid.ReadAsync()).ToList();
        var wishlist = (await grid.ReadAsync()).ToList();
        return Ok(new { success = true, data = new { bookings, payments, reviews, wishlist } });
    }

    [HttpPatch("{userId:long:min(1)}/status")]
    public async Task<ActionResult<AdminUserResponse>> SetStatus(long userId, SetAccountStatusRequest request, CancellationToken ct) =>
        Ok(await service.SetUserStatus(ActorId, userId, request.IsActive!.Value, ct));
}
