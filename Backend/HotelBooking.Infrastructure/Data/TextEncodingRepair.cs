using System.Data;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HotelBooking.Infrastructure.Data;

/// <summary>
/// Sửa dữ liệu tiếng Việt bị lỗi font (mojibake) do script seed được nạp sai bảng mã,
/// VD "Quáº£n trá»‹ viĂªn" → "Quản trị viên". Chỉ sửa ô có dấu hiệu lỗi đặc trưng và
/// chỉ ghi lại khi chuyển đổi ngược cho ra chuỗi hợp lệ — chữ tiếng Việt bình thường không bị đụng tới.
/// </summary>
public static class TextEncodingRepair
{
    /// <summary>Chuỗi con chỉ xuất hiện khi UTF-8 bị đọc nhầm thành Windows-1252/1258.</summary>
    private static readonly string[] Markers = ["áº", "á»", "Æ°", "Æ¡", "Ä‘", "Ä'", "Ã¡", "Ã ", "Ã¢", "Ãª", "Ã´", "Ã³", "Ã©", "Ã¨", "Ã­", "Ã¬", "Ãº", "Ã¹", "Ă¢", "Ăª", "Ă´", "Ă¡", "Ă©", "Ă³", "Ă­", "Ăº"];

    /// <summary>(Bảng, khóa chính, các cột chữ cần kiểm tra).</summary>
    private static readonly (string Table, string Key, string[] Columns)[] Targets =
    [
        ("Roles", "RoleId", ["Description"]),
        ("Hotels", "HotelId", ["HotelName", "Description", "Address", "City"]),
        ("HotelAreas", "AreaId", ["AreaName", "Description", "LocationDescription"]),
        ("RoomTypes", "RoomTypeId", ["RoomTypeName", "Description"]),
    ];

    public static bool LooksBroken(string? value) => !string.IsNullOrEmpty(value) && Markers.Any(m => value.Contains(m, StringComparison.Ordinal));

    /// <summary>Thử giải lỗi theo Windows-1258 rồi Windows-1252; trả về null nếu không chắc chắn.</summary>
    public static string? TryRepair(string value)
    {
        foreach (var codePage in new[] { 1258, 1252 })
        {
            try
            {
                var bytes = Encoding.GetEncoding(codePage, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback).GetBytes(value);
                var fixedText = new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(bytes);
                if (!fixedText.Contains('�') && !LooksBroken(fixedText) && fixedText != value) return fixedText;
            }
            catch (Exception ex) when (ex is EncoderFallbackException or DecoderFallbackException or ArgumentException)
            {
                // Không chuyển được theo bảng mã này → thử bảng mã kế tiếp.
            }
        }
        return null;
    }

    public static async Task RunAsync(DbContext db, ILogger logger, CancellationToken ct = default)
    {
        if (!db.Database.IsRelational()) return;
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        var connection = db.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere) await connection.OpenAsync(ct);
        var repaired = 0;
        try
        {
            foreach (var (table, key, columns) in Targets)
            {
                foreach (var column in columns)
                {
                    var rows = new List<(object Id, string Value)>();
                    await using (var select = connection.CreateCommand())
                    {
                        // Tên bảng/cột là hằng số trong code, không lấy từ người dùng.
                        select.CommandText = $"IF COL_LENGTH('{table}', '{column}') IS NOT NULL SELECT [{key}], [{column}] FROM [{table}] WHERE [{column}] IS NOT NULL";
                        await using var reader = await select.ExecuteReaderAsync(ct);
                        while (await reader.ReadAsync(ct))
                            if (reader.GetValue(1) is string text && LooksBroken(text)) rows.Add((reader.GetValue(0), text));
                    }
                    foreach (var (id, text) in rows)
                    {
                        var fixedText = TryRepair(text);
                        if (fixedText is null) continue;
                        await using var update = connection.CreateCommand();
                        update.CommandText = $"UPDATE [{table}] SET [{column}] = @value WHERE [{key}] = @id";
                        var value = update.CreateParameter(); value.ParameterName = "@value"; value.Value = fixedText; update.Parameters.Add(value);
                        var pid = update.CreateParameter(); pid.ParameterName = "@id"; pid.Value = id; update.Parameters.Add(pid);
                        repaired += await update.ExecuteNonQueryAsync(ct);
                    }
                }
            }
            if (repaired > 0) logger.LogInformation("Đã sửa {Count} ô dữ liệu tiếng Việt bị lỗi font.", repaired);
        }
        catch (Exception ex)
        {
            // Không để việc sửa dữ liệu hiển thị làm hỏng quá trình khởi động.
            logger.LogWarning(ex, "Không sửa được dữ liệu lỗi font; bỏ qua.");
        }
        finally
        {
            if (openedHere) await connection.CloseAsync();
        }
    }
}
