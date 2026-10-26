using HotelBooking.Application.Staff;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public sealed class StaffRepository(HotelBookingDbContext db) : IStaffRepository
{
    public async Task<(IReadOnlyList<User> Users, int Total)> ListAsync(long? onlyUserId, int page, int pageSize, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking().Where(x => x.UserRoles.Any(r => r.Role.RoleName == SystemRoles.HotelStaff));
        if (onlyUserId.HasValue) query = query.Where(x => x.UserId == onlyUserId.Value);
        var total = await query.CountAsync(ct);
        var skip = ((long)page - 1) * pageSize;
        if (skip >= total) return (Array.Empty<User>(), total);
        var items = await query.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .OrderBy(x => x.UserId).Skip((int)skip).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }
}
