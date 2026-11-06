using HotelBooking.Application.DTOs.Pricing;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Services;

public class PricingService : IPricingService
{
    private readonly IRoomPriceHistoryRepository _historyRepository;
    private readonly IPriceSurgeRuleRepository _surgeRuleRepository;

    public PricingService(
        IRoomPriceHistoryRepository historyRepository,
        IPriceSurgeRuleRepository surgeRuleRepository)
    {
        _historyRepository = historyRepository;
        _surgeRuleRepository = surgeRuleRepository;
    }

    public async Task<PriceCalculationResultDto> CalculateStayPriceAsync(
        PriceCalculationRequest request,
        CancellationToken ct = default)
    {
        if (request.CheckOutDate <= request.CheckInDate)
        {
            throw new ArgumentException("CheckOutDate must be after CheckInDate.");
        }

        if (request.RoomIds == null || request.RoomIds.Count == 0)
        {
            throw new ArgumentException("At least one room must be selected.");
        }

        // 1. Lấy thông tin phòng và BasePrice hiện tại từ RoomTypes
        var roomDetails = await _historyRepository.GetRoomDetailsForPricingAsync(request.RoomIds, ct);
        foreach (var roomId in request.RoomIds)
        {
            if (!roomDetails.ContainsKey(roomId))
            {
                throw new KeyNotFoundException($"Room with ID {roomId} was not found.");
            }
        }

        // Tự động nhận diện HotelId từ phòng nếu client chưa truyền
        if (request.HotelId <= 0 && roomDetails.Count > 0)
        {
            request.HotelId = roomDetails.Values.First().HotelId;
        }

        if (request.HotelId <= 0)
        {
            throw new ArgumentException("HotelId must be greater than 0.");
        }

        // Kiểm tra tính nhất quán giữa phòng và khách sạn (Scenario 12)
        foreach (var (roomId, detail) in roomDetails)
        {
            if (detail.HotelId != request.HotelId)
            {
                throw new ArgumentException($"Room {roomId} belongs to Hotel {detail.HotelId}, not Hotel {request.HotelId}.");
            }
        }

        // Số đêm lưu trú: [CheckInDate, CheckOutDate), ngày trả phòng không tính là một đêm lưu trú
        int numberOfNights = request.CheckOutDate.DayNumber - request.CheckInDate.DayNumber;

        // Lấy lịch sử giá theo từng loại phòng để áp dụng giá theo ngày
        var distinctRoomTypeIds = roomDetails.Values.Select(v => v.RoomTypeId).Distinct().ToList();
        var historiesByRoomType = new Dictionary<int, IReadOnlyList<RoomPriceHistory>>();
        foreach (var typeId in distinctRoomTypeIds)
        {
            historiesByRoomType[typeId] = await _historyRepository.GetHistoriesByRoomTypeAsync(typeId, ct);
        }

        // Tải một lần tất cả các quy tắc tăng giá (PriceSurgeRules) liên quan cho toàn bộ khoảng lưu trú
        var activeSurgeRules = await _surgeRuleRepository.GetActiveRulesAsync(
            request.HotelId,
            distinctRoomTypeIds,
            request.CheckInDate,
            request.CheckOutDate,
            ct);

        decimal totalSubTotal = 0m;
        var roomSummaries = new List<RoomStayPriceSummaryDto>();

        // 2. Tính giá từng đêm kết hợp BasePrice/History + PriceSurgeRules
        foreach (var roomId in request.RoomIds)
        {
            var (roomTypeId, _, roomTypeName, basePrice) = roomDetails[roomId];
            var typeHistories = historiesByRoomType.GetValueOrDefault(roomTypeId, Array.Empty<RoomPriceHistory>());
            var dailyBreakdown = new List<DailyPriceBreakdownDto>();
            decimal roomSubTotal = 0m;

            for (int i = 0; i < numberOfNights; i++)
            {
                var stayDate = request.CheckInDate.AddDays(i);
                var stayDateTime = stayDate.ToDateTime(TimeOnly.MinValue);

                // Bước 1: Xác định giá gốc có hiệu lực tại ngày lưu trú (RoomPriceHistory ưu tiên, fallback BasePrice)
                var matchedHistory = typeHistories.FirstOrDefault(h =>
                    h.EffectiveFrom <= stayDateTime &&
                    (!h.EffectiveTo.HasValue || h.EffectiveTo.Value >= stayDateTime));

                decimal nightlyBasePrice;
                string rateSource;

                if (matchedHistory != null)
                {
                    nightlyBasePrice = matchedHistory.Price;
                    rateSource = "History";
                }
                else
                {
                    nightlyBasePrice = basePrice;
                    rateSource = "BasePrice";
                }

                // Bước 2: Tìm các PriceSurgeRules đang hoạt động thỏa mãn ngày và phòng
                var candidateRules = activeSurgeRules
                    .Where(r => r.IsActive)
                    .Where(r => r.RoomTypeId == null || r.RoomTypeId == roomTypeId)
                    .Where(r => stayDate >= r.StartDate && stayDate <= r.EndDate)
                    .OrderByDescending(r => r.Priority)                           // Ưu tiên Priority cao nhất
                    .ThenByDescending(r => r.RoomTypeId.HasValue ? 1 : 0)         // Cụ thể RoomType trước toàn khách sạn
                    .ThenBy(r => r.RuleId)                                        // Tiêu chí ổn định RuleId tăng dần
                    .ToList();

                // Bước 3: Chọn đúng 1 quy tắc theo chính sách ưu tiên
                var matchedRule = candidateRules.FirstOrDefault();

                // Bước 4: Tính phụ thu và giá cuối cùng của đêm
                decimal surgeAmount = 0m;
                string appliedRule = "Giá ngày thường";

                if (matchedRule != null)
                {
                    if (string.Equals(matchedRule.AdjustmentType, "PERCENTAGE", StringComparison.OrdinalIgnoreCase))
                    {
                        surgeAmount = Math.Round(nightlyBasePrice * (matchedRule.AdjustmentValue / 100m), 2);
                        appliedRule = $"{matchedRule.RuleName} (+{matchedRule.AdjustmentValue}%)";
                    }
                    else if (string.Equals(matchedRule.AdjustmentType, "FIXED_AMOUNT", StringComparison.OrdinalIgnoreCase))
                    {
                        surgeAmount = matchedRule.AdjustmentValue;
                        appliedRule = $"{matchedRule.RuleName} (+{matchedRule.AdjustmentValue:N0}đ)";
                    }
                }

                decimal finalNightlyPrice = nightlyBasePrice + surgeAmount;
                roomSubTotal += finalNightlyPrice;

                dailyBreakdown.Add(new DailyPriceBreakdownDto
                {
                    RoomId = roomId,
                    RoomTypeId = roomTypeId,
                    StayDate = stayDate,
                    DayOfWeek = stayDate.DayOfWeek.ToString(),
                    BasePrice = nightlyBasePrice,
                    AppliedRule = appliedRule,
                    SurgeAmount = surgeAmount,
                    FinalNightlyPrice = finalNightlyPrice,
                    NightlyPrice = finalNightlyPrice,
                    RateSource = rateSource
                });
            }

            totalSubTotal += roomSubTotal;

            roomSummaries.Add(new RoomStayPriceSummaryDto
            {
                RoomId = roomId,
                RoomTypeId = roomTypeId,
                RoomTypeName = roomTypeName,
                NumberOfNights = numberOfNights,
                SubTotal = roomSubTotal,
                AverageUnitPrice = numberOfNights > 0 ? Math.Round(roomSubTotal / numberOfNights, 2) : basePrice,
                DailyBreakdown = dailyBreakdown
            });
        }

        // 3. Phụ phí check-in sớm / check-out muộn
        decimal feeAmount = 0m;
        string? feeDescription = null;

        var policy = await _historyRepository.GetHotelCheckInOutPolicyAsync(request.HotelId, ct);
        if (policy.HasValue)
        {
            var (standardIn, standardOut) = policy.Value;
            if (request.CheckInTime.HasValue && request.CheckInTime.Value < standardIn)
            {
                feeDescription = $"Yêu cầu check-in sớm lúc {request.CheckInTime.Value:HH\\:mm} (Giờ chuẩn: {standardIn:HH\\:mm}). Chưa áp dụng phụ phí tự động.";
            }
            if (request.CheckOutTime.HasValue && request.CheckOutTime.Value > standardOut)
            {
                var lateDesc = $"Yêu cầu check-out muộn lúc {request.CheckOutTime.Value:HH\\:mm} (Giờ chuẩn: {standardOut:HH\\:mm}). Chưa áp dụng phụ phí tự động.";
                feeDescription = feeDescription == null ? lateDesc : $"{feeDescription}; {lateDesc}";
            }
        }

        // 4. Đồng bộ công thức thuế (0% VAT) và cọc (70% Deposit)
        decimal estimatedTax = Math.Round(totalSubTotal * 0m, 2);
        decimal estimatedTotal = totalSubTotal + feeAmount + estimatedTax;
        decimal estimatedDeposit = Math.Round(estimatedTotal * 0.70m, 2);

        return new PriceCalculationResultDto
        {
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            NumberOfNights = numberOfNights,
            SubTotal = totalSubTotal,
            FeeAmount = feeAmount,
            FeeDescription = feeDescription,
            EstimatedTaxAmount = estimatedTax,
            EstimatedTotalAmount = estimatedTotal,
            EstimatedDepositAmount = estimatedDeposit,
            RoomSummaries = roomSummaries
        };
    }

    public async Task<IReadOnlyList<RoomPriceHistoryDto>> GetPriceHistoriesAsync(int roomTypeId, CancellationToken ct = default)
    {
        var list = await _historyRepository.GetHistoriesByRoomTypeAsync(roomTypeId, ct);
        return list.Select(h => new RoomPriceHistoryDto
        {
            PriceHistoryId = h.PriceHistoryId,
            RoomTypeId = h.RoomTypeId,
            Price = h.Price,
            EffectiveFrom = h.EffectiveFrom,
            EffectiveTo = h.EffectiveTo,
            ChangedByUserId = h.ChangedByUserId,
            CreatedAt = h.CreatedAt
        }).ToList();
    }

    public async Task<RoomPriceHistoryDto> AddPriceHistoryAsync(
        int roomTypeId,
        CreateRoomPriceHistoryRequest request,
        long changedByUserId,
        CancellationToken ct = default)
    {
        if (request.Price < 0)
        {
            throw new ArgumentException("Price must be nonnegative.");
        }

        if (request.EffectiveTo.HasValue && request.EffectiveTo.Value <= request.EffectiveFrom)
        {
            throw new ArgumentException("EffectiveTo must be after EffectiveFrom.");
        }

        var history = new RoomPriceHistory
        {
            RoomTypeId = roomTypeId,
            Price = request.Price,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            ChangedByUserId = changedByUserId,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _historyRepository.AddHistoryAsync(history, ct);

        return new RoomPriceHistoryDto
        {
            PriceHistoryId = created.PriceHistoryId,
            RoomTypeId = created.RoomTypeId,
            Price = created.Price,
            EffectiveFrom = created.EffectiveFrom,
            EffectiveTo = created.EffectiveTo,
            ChangedByUserId = created.ChangedByUserId,
            CreatedAt = created.CreatedAt
        };
    }

    public async Task<IReadOnlyList<PriceSurgeRuleDto>> GetSurgeRulesAsync(
        PriceSurgeRuleFilterRequest filter,
        CancellationToken ct = default)
    {
        var rules = await _surgeRuleRepository.GetListAsync(filter, ct);
        var result = new List<PriceSurgeRuleDto>();

        foreach (var rule in rules)
        {
            string? typeName = null;
            if (rule.RoomTypeId.HasValue)
            {
                typeName = await _surgeRuleRepository.GetRoomTypeNameAsync(rule.RoomTypeId.Value, ct);
            }

            result.Add(new PriceSurgeRuleDto
            {
                RuleId = rule.RuleId,
                HotelId = rule.HotelId,
                RoomTypeId = rule.RoomTypeId,
                RoomTypeName = typeName,
                RuleName = rule.RuleName,
                StartDate = rule.StartDate,
                EndDate = rule.EndDate,
                AdjustmentType = rule.AdjustmentType,
                AdjustmentValue = rule.AdjustmentValue,
                Priority = rule.Priority,
                IsActive = rule.IsActive,
                CreatedAt = rule.CreatedAt,
                CreatedByUserId = rule.CreatedByUserId
            });
        }

        return result;
    }

    public async Task<PriceSurgeRuleDto?> GetSurgeRuleByIdAsync(long ruleId, CancellationToken ct = default)
    {
        var rule = await _surgeRuleRepository.GetByIdAsync(ruleId, ct);
        if (rule == null) return null;

        string? typeName = null;
        if (rule.RoomTypeId.HasValue)
        {
            typeName = await _surgeRuleRepository.GetRoomTypeNameAsync(rule.RoomTypeId.Value, ct);
        }

        return new PriceSurgeRuleDto
        {
            RuleId = rule.RuleId,
            HotelId = rule.HotelId,
            RoomTypeId = rule.RoomTypeId,
            RoomTypeName = typeName,
            RuleName = rule.RuleName,
            StartDate = rule.StartDate,
            EndDate = rule.EndDate,
            AdjustmentType = rule.AdjustmentType,
            AdjustmentValue = rule.AdjustmentValue,
            Priority = rule.Priority,
            IsActive = rule.IsActive,
            CreatedAt = rule.CreatedAt,
            CreatedByUserId = rule.CreatedByUserId
        };
    }

    public async Task<PriceSurgeRuleDto> CreateSurgeRuleAsync(
        CreatePriceSurgeRuleRequest request,
        long createdByUserId,
        CancellationToken ct = default)
    {
        ValidateSurgeRuleInput(request.StartDate, request.EndDate, request.AdjustmentType, request.AdjustmentValue);

        if (request.HotelId <= 0)
        {
            throw new ArgumentException("HotelId must be greater than 0.");
        }

        if (request.RoomTypeId.HasValue)
        {
            var belongs = await _surgeRuleRepository.IsRoomTypeBelongToHotelAsync(request.RoomTypeId.Value, request.HotelId, ct);
            if (!belongs)
            {
                throw new ArgumentException($"RoomTypeId {request.RoomTypeId.Value} does not belong to HotelId {request.HotelId}.");
            }
        }

        var entity = new PriceSurgeRule
        {
            HotelId = request.HotelId,
            RoomTypeId = request.RoomTypeId,
            RuleName = request.RuleName.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            AdjustmentType = request.AdjustmentType.ToUpperInvariant(),
            AdjustmentValue = request.AdjustmentValue,
            Priority = request.Priority,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = createdByUserId
        };

        var created = await _surgeRuleRepository.AddAsync(entity, ct);
        return await GetSurgeRuleByIdAsync(created.RuleId, ct) ?? new PriceSurgeRuleDto
        {
            RuleId = created.RuleId,
            HotelId = created.HotelId,
            RoomTypeId = created.RoomTypeId,
            RuleName = created.RuleName,
            StartDate = created.StartDate,
            EndDate = created.EndDate,
            AdjustmentType = created.AdjustmentType,
            AdjustmentValue = created.AdjustmentValue,
            Priority = created.Priority,
            IsActive = created.IsActive,
            CreatedAt = created.CreatedAt,
            CreatedByUserId = created.CreatedByUserId
        };
    }

    public async Task<PriceSurgeRuleDto> UpdateSurgeRuleAsync(
        long ruleId,
        UpdatePriceSurgeRuleRequest request,
        CancellationToken ct = default)
    {
        ValidateSurgeRuleInput(request.StartDate, request.EndDate, request.AdjustmentType, request.AdjustmentValue);

        var existing = await _surgeRuleRepository.GetByIdAsync(ruleId, ct);
        if (existing == null)
        {
            throw new KeyNotFoundException($"PriceSurgeRule with ID {ruleId} was not found.");
        }

        existing.RuleName = request.RuleName.Trim();
        existing.StartDate = request.StartDate;
        existing.EndDate = request.EndDate;
        existing.AdjustmentType = request.AdjustmentType.ToUpperInvariant();
        existing.AdjustmentValue = request.AdjustmentValue;
        existing.Priority = request.Priority;
        existing.IsActive = request.IsActive;

        await _surgeRuleRepository.UpdateAsync(existing, ct);
        return (await GetSurgeRuleByIdAsync(ruleId, ct))!;
    }

    public async Task<bool> ToggleSurgeRuleStatusAsync(long ruleId, CancellationToken ct = default)
    {
        var existing = await _surgeRuleRepository.GetByIdAsync(ruleId, ct);
        if (existing == null)
        {
            throw new KeyNotFoundException($"PriceSurgeRule with ID {ruleId} was not found.");
        }

        existing.IsActive = !existing.IsActive;
        await _surgeRuleRepository.UpdateAsync(existing, ct);
        return existing.IsActive;
    }

    public async Task<bool> DeleteSurgeRuleAsync(long ruleId, CancellationToken ct = default)
    {
        var existing = await _surgeRuleRepository.GetByIdAsync(ruleId, ct);
        if (existing == null)
        {
            return false;
        }

        return await _surgeRuleRepository.DeleteAsync(ruleId, ct);
    }

    private static void ValidateSurgeRuleInput(
        DateOnly startDate,
        DateOnly endDate,
        string adjustmentType,
        decimal adjustmentValue)
    {
        if (endDate < startDate)
        {
            throw new ArgumentException("EndDate must be greater than or equal to StartDate.");
        }

        if (adjustmentValue < 0)
        {
            throw new ArgumentException("AdjustmentValue must be nonnegative.");
        }

        var normalizedType = adjustmentType?.Trim().ToUpperInvariant();
        if (normalizedType != "PERCENTAGE" && normalizedType != "FIXED_AMOUNT")
        {
            throw new ArgumentException("AdjustmentType must be either 'PERCENTAGE' or 'FIXED_AMOUNT'.");
        }
    }
}
