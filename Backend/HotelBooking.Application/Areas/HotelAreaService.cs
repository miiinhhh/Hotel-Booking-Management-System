using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Areas;

public sealed class HotelAreaService(IHotelAreaRepository repository)
{
    public async Task<IReadOnlyList<HotelAreaDto>> ListAsync(
        int hotelId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        await EnsureHotelExistsAsync(hotelId, cancellationToken);
        return (await repository.ListAsync(hotelId, includeInactive, cancellationToken))
            .Select(Map)
            .ToList();
    }

    public async Task<HotelAreaDto> GetAsync(int hotelId, int areaId, CancellationToken cancellationToken) =>
        Map(await FindInHotelAsync(hotelId, areaId, cancellationToken));

    public async Task<HotelAreaDto> CreateAsync(
        int hotelId,
        HotelAreaRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureActiveHotelExistsAsync(hotelId, cancellationToken);
        await ValidateParentAsync(hotelId, currentAreaId: 0, request.AreaType, request.ParentAreaId, cancellationToken);

        var area = new HotelArea(
            hotelId,
            request.AreaName,
            request.AreaType,
            request.ParentAreaId,
            request.Description,
            request.LocationDescription,
            request.FloorCount,
            request.IsActive);

        await EnsureUniqueNameAsync(area, cancellationToken);
        repository.Add(area);
        await repository.SaveAsync(cancellationToken);
        return Map(area);
    }

    public async Task<HotelAreaDto> UpdateAsync(
        int hotelId,
        int areaId,
        HotelAreaRequest request,
        CancellationToken cancellationToken)
    {
        await EnsureActiveHotelExistsAsync(hotelId, cancellationToken);
        var area = await FindInHotelAsync(hotelId, areaId, cancellationToken);

        if (request.ParentAreaId == areaId)
            throw new ConflictException("An area cannot be its own parent.");
        if (!string.Equals(area.AreaType, request.AreaType, StringComparison.OrdinalIgnoreCase) &&
            await repository.HasChildrenAsync(areaId, cancellationToken))
            throw new ConflictException("An area with child buildings cannot change its type.");

        await ValidateParentAsync(hotelId, areaId, request.AreaType, request.ParentAreaId, cancellationToken);
        if (area.IsActive && !request.IsActive)
            await EnsureCanDeactivateAsync(areaId, cancellationToken);

        area.Update(
            request.AreaName,
            request.AreaType,
            request.ParentAreaId,
            request.Description,
            request.LocationDescription,
            request.FloorCount,
            request.IsActive);

        await EnsureUniqueNameAsync(area, cancellationToken);
        await repository.SaveAsync(cancellationToken);
        return Map(area);
    }

    public async Task DeactivateAsync(int hotelId, int areaId, CancellationToken cancellationToken)
    {
        var area = await FindInHotelAsync(hotelId, areaId, cancellationToken);
        if (!area.IsActive) return;

        await EnsureCanDeactivateAsync(areaId, cancellationToken);
        area.Deactivate();
        await repository.SaveAsync(cancellationToken);
    }

    private async Task ValidateParentAsync(
        int hotelId,
        int currentAreaId,
        string areaType,
        int? parentAreaId,
        CancellationToken cancellationToken)
    {
        if (string.Equals(areaType?.Trim(), "Zone", StringComparison.OrdinalIgnoreCase) || !parentAreaId.HasValue)
            return;
        if (parentAreaId.Value == currentAreaId)
            throw new ConflictException("An area cannot be its own parent.");

        var parent = await repository.GetAsync(parentAreaId.Value, cancellationToken);
        if (parent is null || parent.HotelId != hotelId)
            throw new NotFoundException("Parent Zone was not found in this hotel.");
        if (!parent.IsActive || !string.Equals(parent.AreaType, "Zone", StringComparison.Ordinal))
            throw new ConflictException("A Building parent must be an active Zone in the same hotel.");
    }

    private async Task EnsureCanDeactivateAsync(int areaId, CancellationToken cancellationToken)
    {
        if (await repository.HasActiveChildrenAsync(areaId, cancellationToken))
            throw new ConflictException("Deactivate child buildings before deactivating this Zone.");
        if (await repository.HasActiveRoomTypesAsync(areaId, cancellationToken))
            throw new ConflictException("Deactivate room types before deactivating this area.");
        if (await repository.HasActiveRoomsAsync(areaId, cancellationToken))
            throw new ConflictException("Deactivate rooms before deactivating this area.");
        if (await repository.HasActiveStaffAssignmentsAsync(areaId, cancellationToken))
            throw new ConflictException("Remove active staff assignments before deactivating this area.");
    }

    private async Task EnsureUniqueNameAsync(HotelArea area, CancellationToken cancellationToken)
    {
        if (await repository.NameExistsAsync(area.HotelId, area.AreaName, area.AreaId, cancellationToken))
            throw new ConflictException("Area name already exists in this hotel.");
    }

    private async Task EnsureHotelExistsAsync(int hotelId, CancellationToken cancellationToken)
    {
        if (hotelId <= 0 || !await repository.HotelExistsAsync(hotelId, cancellationToken))
            throw new NotFoundException("Hotel not found.");
    }

    private async Task EnsureActiveHotelExistsAsync(int hotelId, CancellationToken cancellationToken)
    {
        if (hotelId <= 0 || !await repository.ActiveHotelExistsAsync(hotelId, cancellationToken))
            throw new NotFoundException("Active hotel not found.");
    }

    private async Task<HotelArea> FindInHotelAsync(int hotelId, int areaId, CancellationToken cancellationToken)
    {
        var area = areaId > 0 ? await repository.GetAsync(areaId, cancellationToken) : null;
        return area is not null && area.HotelId == hotelId
            ? area
            : throw new NotFoundException("Area not found in this hotel.");
    }

    private static HotelAreaDto Map(HotelArea area) => new(
        area.AreaId,
        area.HotelId,
        area.AreaName,
        area.AreaType,
        area.ParentAreaId,
        area.ParentArea?.AreaName,
        area.Description,
        area.LocationDescription,
        area.FloorCount,
        area.IsActive,
        area.SubAreas.Count,
        area.RoomTypes.Count,
        area.Rooms.Count,
        area.StaffAssignments.Count(assignment => assignment.IsActive),
        area.CreatedAt,
        area.UpdatedAt);
}
