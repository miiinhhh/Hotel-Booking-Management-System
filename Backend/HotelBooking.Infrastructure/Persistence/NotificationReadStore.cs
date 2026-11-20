using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Persistence;

/// <summary>
/// Lưu/đọc trạng thái "đã đọc" của thông báo theo tài khoản. Thông báo được tổng hợp động,
/// nên khóa thông báo đổi khi có sự kiện mới (vd. thêm đánh giá chờ duyệt) → lại hiện là chưa đọc.
/// </summary>
public sealed class NotificationReadStore(HotelBookingDbContext db)
{
    public const int MaxKeyLength = 200;
    public const int MaxKeysPerRequest = 200;
    private static readonly TimeSpan Retention = TimeSpan.FromDays(90);

    public async Task<HashSet<string>> ReadKeysAsync(long userId, IEnumerable<string> keys, CancellationToken ct)
    {
        var list = keys.Where(k => !string.IsNullOrEmpty(k) && k.Length <= MaxKeyLength).Distinct().ToList();
        if (list.Count == 0) return [];
        var read = await db.UserNotificationReads.AsNoTracking()
            .Where(x => x.UserId == userId && list.Contains(x.NotificationKey))
            .Select(x => x.NotificationKey)
            .ToListAsync(ct);
        return read.ToHashSet(StringComparer.Ordinal);
    }

    public async Task<int> MarkReadAsync(long userId, IEnumerable<string> keys, CancellationToken ct)
    {
        var list = keys.Where(k => !string.IsNullOrWhiteSpace(k) && k.Length <= MaxKeyLength)
            .Select(k => k.Trim()).Distinct(StringComparer.Ordinal).Take(MaxKeysPerRequest).ToList();
        if (list.Count == 0) return 0;
        var existing = (await ReadKeysAsync(userId, list, ct));
        var now = DateTime.UtcNow;
        foreach (var key in list.Where(k => !existing.Contains(k)))
            db.UserNotificationReads.Add(new UserNotificationRead { UserId = userId, NotificationKey = key, ReadAt = now });
        // Dọn bản ghi cũ để bảng không phình to (khóa cũ không còn xuất hiện trong danh sách thông báo).
        var cutoff = now - Retention;
        var stale = await db.UserNotificationReads.Where(x => x.UserId == userId && x.ReadAt < cutoff).ToListAsync(ct);
        db.UserNotificationReads.RemoveRange(stale);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { db.ChangeTracker.Clear(); } // Hai thiết bị đánh dấu cùng lúc: coi như đã đọc.
        return list.Count - existing.Count;
    }

    /// <summary>Tạo bảng nếu CSDL SQL Server chưa có (giống Database&amp;Docs/Notifications.sql).</summary>
    public static async Task EnsureSchemaAsync(HotelBookingDbContext db, CancellationToken ct = default)
    {
        if (!db.Database.IsSqlServer()) return;
        await db.Database.ExecuteSqlRawAsync("""
            IF OBJECT_ID(N'dbo.UserNotificationReads', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.UserNotificationReads (
                    UserId BIGINT NOT NULL,
                    NotificationKey VARCHAR(200) NOT NULL,
                    ReadAt DATETIME2 NOT NULL CONSTRAINT DF_UserNotificationReads_ReadAt DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT PK_UserNotificationReads PRIMARY KEY (UserId, NotificationKey),
                    CONSTRAINT FK_UserNotificationReads_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
                );
                CREATE INDEX IX_UserNotificationReads_ReadAt ON dbo.UserNotificationReads (ReadAt);
            END
            """, ct);
    }
}
