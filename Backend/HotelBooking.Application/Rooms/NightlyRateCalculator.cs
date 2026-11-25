using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Rooms;

// Shared by discovery/inventory and checkout. Checkout adds taxes, fees and vouchers separately.
public static class NightlyRateCalculator
{
    public static IReadOnlyList<AvailableRoom> PriceRooms(IReadOnlyList<AvailableRoom> rooms,
        DateOnly checkIn, DateOnly checkOut, IReadOnlyList<RoomPriceHistory> histories, IReadOnlyList<PriceSurgeRule> rules)
    {
        var nights = checkOut.DayNumber - checkIn.DayNumber;
        if (nights <= 0) throw new DomainRuleException("Check-out must follow check-in.");
        // A physical room shares its type's rate. Calculate once per type for the whole stay.
        var prices = rooms.GroupBy(r => new { r.HotelId, r.RoomTypeId }).ToDictionary(g => g.Key, g =>
        {
            var room = g.First();
            var typeHistory = histories.Where(h => h.RoomTypeId == room.RoomTypeId).ToArray();
            var typeRules = rules.Where(r => r.HotelId == room.HotelId && (r.RoomTypeId == null || r.RoomTypeId == room.RoomTypeId)).ToArray();
            var total = 0m;
            for (var day = checkIn; day < checkOut; day = day.AddDays(1))
                total += Calculate(room.HotelId, room.RoomTypeId, room.Price, day, typeHistory, typeRules).Total;
            return Math.Round(total / nights, 2);
        });
        return rooms.Select(r => r with { Price = prices[new { r.HotelId, r.RoomTypeId }] }).ToArray();
    }

    public sealed record Rate(decimal BasePrice, decimal SurgeAmount, string Source, string AppliedRule)
    {
        public decimal Total => BasePrice + SurgeAmount;
    }

    public static Rate Calculate(int hotelId, int roomTypeId, decimal fallbackPrice, DateOnly day,
        IEnumerable<RoomPriceHistory> histories, IEnumerable<PriceSurgeRule> rules)
    {
        var midnight = day.ToDateTime(TimeOnly.MinValue);
        var history = histories.Where(h => h.RoomTypeId == roomTypeId && h.EffectiveFrom <= midnight &&
                (!h.EffectiveTo.HasValue || h.EffectiveTo >= midnight))
            .OrderByDescending(h => h.EffectiveFrom).ThenByDescending(h => h.CreatedAt)
            .ThenByDescending(h => h.PriceHistoryId).FirstOrDefault();
        var price = history?.Price ?? fallbackPrice;
        var rule = rules.Where(r => r.HotelId == hotelId && r.IsActive &&
                (r.RoomTypeId == null || r.RoomTypeId == roomTypeId) && day >= r.StartDate && day <= r.EndDate)
            .OrderByDescending(r => r.Priority).ThenByDescending(r => r.RoomTypeId.HasValue)
            .ThenBy(r => r.RuleId).FirstOrDefault();
        var surge = 0m;
        var description = "Giá ngày thường";
        if (rule is not null && string.Equals(rule.AdjustmentType, "PERCENTAGE", StringComparison.OrdinalIgnoreCase))
        {
            surge = Math.Round(price * rule.AdjustmentValue / 100m, 2);
            description = $"{rule.RuleName} (+{rule.AdjustmentValue}%)";
        }
        else if (rule is not null && string.Equals(rule.AdjustmentType, "FIXED_AMOUNT", StringComparison.OrdinalIgnoreCase))
        {
            surge = rule.AdjustmentValue;
            description = $"{rule.RuleName} (+{HotelBooking.Application.Common.MoneyText.Vnd(rule.AdjustmentValue)}đ)";
        }
        return new(price, surge, history is null ? "BasePrice" : "History", description);
    }
}
