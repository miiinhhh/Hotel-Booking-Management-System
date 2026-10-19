using System.ComponentModel.DataAnnotations;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Rooms;

public sealed class RoomSearchRequest
{
    [StringLength(100)]
    public string? RoomTypeName { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal? MinPrice { get; init; }

    [Range(typeof(decimal), "0", "9999999999999999.99")]
    public decimal? MaxPrice { get; init; }

    [Range(1, int.MaxValue)]
    public int PageNumber { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 20;
}

public sealed record RoomSearchCriteria(int HotelId, string? RoomTypeName,
    decimal? MinPrice, decimal? MaxPrice, int Offset, int PageSize);

public sealed record RoomSearchItem(long RoomId, int HotelId, int AreaId,
    int RoomTypeId, string RoomTypeName, string RoomNumber, int Floor,
    string? Description, decimal Price, int Capacity);

public sealed record RoomSearchResult(IReadOnlyList<RoomSearchItem> Items,
    int TotalCount, int PageNumber, int PageSize, int TotalPages, string? Message);

public interface IRoomSearchRepository
{
    Task<(IReadOnlyList<RoomSearchItem> Items, int TotalCount)> SearchAsync(
        RoomSearchCriteria criteria, CancellationToken ct);
}

public interface IRoomSearchService
{
    Task<RoomSearchResult> SearchAsync(int hotelId, RoomSearchRequest request, CancellationToken ct);
}

public sealed class RoomSearchService(IRoomSearchRepository repository) : IRoomSearchService
{
    public async Task<RoomSearchResult> SearchAsync(int hotelId, RoomSearchRequest request, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        var validationResults = new List<ValidationResult>();
        if (hotelId <= 0 || !Validator.TryValidateObject(request,
                new ValidationContext(request), validationResults, validateAllProperties: true))
            throw new DomainRuleException("Invalid room search parameters.");
        if (request.MinPrice.HasValue && request.MaxPrice.HasValue && request.MinPrice > request.MaxPrice)
            throw new DomainRuleException("MinPrice must not exceed MaxPrice.");

        var offset = ((long)request.PageNumber - 1) * request.PageSize;
        if (offset > int.MaxValue)
            throw new DomainRuleException("Requested page is too large.");

        var name = request.RoomTypeName?.Trim();
        var criteria = new RoomSearchCriteria(hotelId, string.IsNullOrEmpty(name) ? null : name,
            request.MinPrice, request.MaxPrice, (int)offset, request.PageSize);
        var (items, totalCount) = await repository.SearchAsync(criteria, ct);
        var totalPages = (int)(((long)totalCount + request.PageSize - 1) / request.PageSize);
        return new RoomSearchResult(items, totalCount, request.PageNumber, request.PageSize, totalPages,
            items.Count == 0 ? "Không tìm thấy phòng phù hợp. Hãy thay đổi bộ lọc hoặc trang tìm kiếm." : null);
    }
}
