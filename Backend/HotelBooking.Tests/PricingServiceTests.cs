using HotelBooking.Application.DTOs.Pricing;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using Xunit;

namespace HotelBooking.Tests;

public class PricingServiceTests
{
    private class FakeRoomPriceHistoryRepository : IRoomPriceHistoryRepository
    {
        public Dictionary<long, (int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)> RoomDetails { get; } = new();
        public List<RoomPriceHistory> Histories { get; } = new();
        public (TimeOnly CheckInTime, TimeOnly CheckOutTime)? HotelPolicy { get; set; } = null;

        public Task<Dictionary<long, (int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)>> GetRoomDetailsForPricingAsync(
            IEnumerable<long> roomIds,
            CancellationToken ct = default)
        {
            var result = roomIds
                .Where(id => RoomDetails.ContainsKey(id))
                .ToDictionary(id => id, id => RoomDetails[id]);
            return Task.FromResult(result);
        }

        public Task<IReadOnlyList<RoomPriceHistory>> GetHistoriesByRoomTypeAsync(int roomTypeId, CancellationToken ct = default)
        {
            var list = Histories
                .Where(h => h.RoomTypeId == roomTypeId)
                .OrderByDescending(h => h.EffectiveFrom)
                .ToList();
            return Task.FromResult<IReadOnlyList<RoomPriceHistory>>(list);
        }

        public Task<RoomPriceHistory> AddHistoryAsync(RoomPriceHistory history, CancellationToken ct = default)
        {
            Histories.Add(history);
            return Task.FromResult(history);
        }

        public Task<(TimeOnly CheckInTime, TimeOnly CheckOutTime)?> GetHotelCheckInOutPolicyAsync(int hotelId, CancellationToken ct = default)
        {
            return Task.FromResult(HotelPolicy);
        }
    }

    private class FakePriceSurgeRuleRepository : IPriceSurgeRuleRepository
    {
        public List<PriceSurgeRule> Rules { get; } = new();
        public Dictionary<int, (int HotelId, string RoomTypeName)> RoomTypeMappings { get; } = new();

        public Task<IReadOnlyList<PriceSurgeRule>> GetActiveRulesAsync(
            int hotelId,
            IEnumerable<int> roomTypeIds,
            DateOnly startDate,
            DateOnly endDate,
            CancellationToken ct = default)
        {
            var typeIds = roomTypeIds.Distinct().ToList();
            var matched = Rules
                .Where(r => r.HotelId == hotelId && r.IsActive)
                .Where(r => r.RoomTypeId == null || typeIds.Contains(r.RoomTypeId.Value))
                .Where(r => r.StartDate <= endDate && r.EndDate >= startDate)
                .ToList();
            return Task.FromResult<IReadOnlyList<PriceSurgeRule>>(matched);
        }

        public Task<IReadOnlyList<PriceSurgeRule>> GetListAsync(PriceSurgeRuleFilterRequest filter, CancellationToken ct = default)
        {
            var query = Rules.AsQueryable();
            if (filter.HotelId.HasValue) query = query.Where(r => r.HotelId == filter.HotelId.Value);
            if (filter.RoomTypeId.HasValue) query = query.Where(r => r.RoomTypeId == filter.RoomTypeId.Value);
            if (filter.IsActive.HasValue) query = query.Where(r => r.IsActive == filter.IsActive.Value);
            if (filter.FromDate.HasValue) query = query.Where(r => r.EndDate >= filter.FromDate.Value);
            if (filter.ToDate.HasValue) query = query.Where(r => r.StartDate <= filter.ToDate.Value);
            return Task.FromResult<IReadOnlyList<PriceSurgeRule>>(query.ToList());
        }

        public Task<PriceSurgeRule?> GetByIdAsync(long ruleId, CancellationToken ct = default)
        {
            return Task.FromResult(Rules.FirstOrDefault(r => r.RuleId == ruleId));
        }

        public Task<PriceSurgeRule> AddAsync(PriceSurgeRule rule, CancellationToken ct = default)
        {
            rule.RuleId = Rules.Count > 0 ? Rules.Max(r => r.RuleId) + 1 : 1;
            Rules.Add(rule);
            return Task.FromResult(rule);
        }

        public Task<PriceSurgeRule> UpdateAsync(PriceSurgeRule rule, CancellationToken ct = default)
        {
            var idx = Rules.FindIndex(r => r.RuleId == rule.RuleId);
            if (idx >= 0) Rules[idx] = rule;
            return Task.FromResult(rule);
        }

        public Task<bool> DeleteAsync(long ruleId, CancellationToken ct = default)
        {
            var item = Rules.FirstOrDefault(r => r.RuleId == ruleId);
            if (item == null) return Task.FromResult(false);
            Rules.Remove(item);
            return Task.FromResult(true);
        }

        public Task<bool> IsRoomTypeBelongToHotelAsync(int roomTypeId, int hotelId, CancellationToken ct = default)
        {
            if (RoomTypeMappings.TryGetValue(roomTypeId, out var mapping))
            {
                return Task.FromResult(mapping.HotelId == hotelId);
            }
            return Task.FromResult(false);
        }

        public Task<string?> GetRoomTypeNameAsync(int roomTypeId, CancellationToken ct = default)
        {
            if (RoomTypeMappings.TryGetValue(roomTypeId, out var mapping))
            {
                return Task.FromResult<string?>(mapping.RoomTypeName);
            }
            return Task.FromResult<string?>(null);
        }
    }

    private readonly FakeRoomPriceHistoryRepository _historyRepo = new();
    private readonly FakePriceSurgeRuleRepository _surgeRepo = new();
    private readonly PricingService _service;

    public PricingServiceTests()
    {
        _service = new PricingService(_historyRepo, _surgeRepo);

        // Cấu hình phòng mặc định
        _historyRepo.RoomDetails[1001] = (101, 1, "Deluxe Ocean View", 1_000_000m);
        _surgeRepo.RoomTypeMappings[101] = (1, "Deluxe Ocean View");
    }

    [Fact]
    public async Task MandatoryScenario_HalloweenSurgePricing_CalculatesExpectedAmounts()
    {
        // Arrange
        // Halloween rule: 30/10/2026 đến 31/10/2026, tăng +25%
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Lễ hội Halloween & Pháo hoa",
            StartDate = new DateOnly(2026, 10, 30),
            EndDate = new DateOnly(2026, 10, 31),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 25m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 10, 29),
            CheckOutDate = new DateOnly(2026, 11, 2)
        };

        // Act
        var result = await _service.CalculateStayPriceAsync(request);

        // Assert
        Assert.Equal(4, result.NumberOfNights);
        Assert.Equal(4, result.TotalNights);
        Assert.Equal(4_500_000m, result.SubTotal);
        Assert.Equal(450_000m, result.TaxVAT);
        Assert.Equal(450_000m, result.EstimatedTaxAmount);
        Assert.Equal(4_950_000m, result.GrandTotal);
        Assert.Equal(4_950_000m, result.EstimatedTotalAmount);
        Assert.Equal(1_485_000m, result.DepositRequired);
        Assert.Equal(1_485_000m, result.EstimatedDepositAmount);

        var summary = Assert.Single(result.RoomSummaries);
        Assert.Equal("Deluxe Ocean View", summary.RoomTypeName);
        Assert.Equal(4, summary.DailyBreakdown.Count);

        // Đêm 29/10/2026: Giá ngày thường 1.000.000 VNĐ
        var d1 = summary.DailyBreakdown[0];
        Assert.Equal(new DateOnly(2026, 10, 29), d1.StayDate);
        Assert.Equal(1_000_000m, d1.BasePrice);
        Assert.Equal(0m, d1.SurgeAmount);
        Assert.Equal(1_000_000m, d1.FinalNightlyPrice);

        // Đêm 30/10/2026: Tăng 25% -> 1.250.000 VNĐ
        var d2 = summary.DailyBreakdown[1];
        Assert.Equal(new DateOnly(2026, 10, 30), d2.StayDate);
        Assert.Equal(1_000_000m, d2.BasePrice);
        Assert.Equal(250_000m, d2.SurgeAmount);
        Assert.Equal(1_250_000m, d2.FinalNightlyPrice);
        Assert.Contains("Lễ hội Halloween & Pháo hoa (+25%)", d2.AppliedRule);

        // Đêm 31/10/2026: Tăng 25% -> 1.250.000 VNĐ
        var d3 = summary.DailyBreakdown[2];
        Assert.Equal(new DateOnly(2026, 10, 31), d3.StayDate);
        Assert.Equal(1_000_000m, d3.BasePrice);
        Assert.Equal(250_000m, d3.SurgeAmount);
        Assert.Equal(1_250_000m, d3.FinalNightlyPrice);
        Assert.Contains("Lễ hội Halloween & Pháo hoa (+25%)", d3.AppliedRule);

        // Đêm 01/11/2026: Giá ngày thường 1.000.000 VNĐ
        var d4 = summary.DailyBreakdown[3];
        Assert.Equal(new DateOnly(2026, 11, 1), d4.StayDate);
        Assert.Equal(1_000_000m, d4.BasePrice);
        Assert.Equal(0m, d4.SurgeAmount);
        Assert.Equal(1_000_000m, d4.FinalNightlyPrice);
    }

    [Fact]
    public async Task Scenario1_NoSurgeRules_UsesBasePriceForAllNights()
    {
        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 5, 1),
            CheckOutDate = new DateOnly(2026, 5, 3)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        Assert.Equal(2, result.NumberOfNights);
        Assert.Equal(2_000_000m, result.SubTotal);
        Assert.All(result.RoomSummaries[0].DailyBreakdown, d =>
        {
            Assert.Equal(0m, d.SurgeAmount);
            Assert.Equal(1_000_000m, d.FinalNightlyPrice);
            Assert.Equal("Giá ngày thường", d.AppliedRule);
        });
    }

    [Fact]
    public async Task Scenario2_PercentageSurgeRule_AppliesCorrectPercentage()
    {
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Mùa hè sôi động",
            StartDate = new DateOnly(2026, 6, 1),
            EndDate = new DateOnly(2026, 6, 5),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 20m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 6, 1),
            CheckOutDate = new DateOnly(2026, 6, 2)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        var night = result.RoomSummaries[0].DailyBreakdown[0];
        Assert.Equal(200_000m, night.SurgeAmount);
        Assert.Equal(1_200_000m, night.FinalNightlyPrice);
    }

    [Fact]
    public async Task Scenario3_FixedAmountSurgeRule_AppliesExactFixedAmount()
    {
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Phụ thu sự kiện âm nhạc",
            StartDate = new DateOnly(2026, 7, 10),
            EndDate = new DateOnly(2026, 7, 12),
            AdjustmentType = "FIXED_AMOUNT",
            AdjustmentValue = 150_000m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 7, 10),
            CheckOutDate = new DateOnly(2026, 7, 12)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        Assert.Equal(2_300_000m, result.SubTotal); // (1.000.000 + 150.000) * 2
        Assert.All(result.RoomSummaries[0].DailyBreakdown, d =>
        {
            Assert.Equal(150_000m, d.SurgeAmount);
            Assert.Equal(1_150_000m, d.FinalNightlyPrice);
        });
    }

    [Fact]
    public async Task Scenario4_InactiveOrOutOfRangeRule_IsIgnored()
    {
        // Rule vô hiệu hóa
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Rule bị tắt",
            StartDate = new DateOnly(2026, 8, 1),
            EndDate = new DateOnly(2026, 8, 10),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 50m,
            IsActive = false
        });

        // Rule ngoài khoảng
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 2,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Rule ngoài ngày",
            StartDate = new DateOnly(2026, 8, 20),
            EndDate = new DateOnly(2026, 8, 25),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 50m,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 8, 2),
            CheckOutDate = new DateOnly(2026, 8, 4)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        Assert.Equal(2_000_000m, result.SubTotal);
        Assert.All(result.RoomSummaries[0].DailyBreakdown, d => Assert.Equal(0m, d.SurgeAmount));
    }

    [Fact]
    public async Task Scenario5_HotelWideRuleAndRoomTypeSpecificRule_RoomTypeWinsWhenEqualPriority()
    {
        // Rule áp dụng toàn khách sạn: +10%
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = null,
            RuleName = "Toàn khách sạn",
            StartDate = new DateOnly(2026, 9, 1),
            EndDate = new DateOnly(2026, 9, 5),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 10m,
            Priority = 5,
            IsActive = true
        });

        // Rule riêng hạng phòng 101: +30%
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 2,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Riêng hạng phòng Deluxe",
            StartDate = new DateOnly(2026, 9, 1),
            EndDate = new DateOnly(2026, 9, 5),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 30m,
            Priority = 5,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 9, 1),
            CheckOutDate = new DateOnly(2026, 9, 2)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        var night = result.RoomSummaries[0].DailyBreakdown[0];
        Assert.Equal(300_000m, night.SurgeAmount); // Phải chọn rule riêng hạng phòng (+30%)
        Assert.Contains("Riêng hạng phòng Deluxe", night.AppliedRule);
    }

    [Fact]
    public async Task Scenario6_OverlappingRules_HigherPriorityWins()
    {
        // Rule ưu tiên thấp hơn (Priority 1)
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Phụ thu thấp",
            StartDate = new DateOnly(2026, 10, 1),
            EndDate = new DateOnly(2026, 10, 5),
            AdjustmentType = "FIXED_AMOUNT",
            AdjustmentValue = 50_000m,
            Priority = 1,
            IsActive = true
        });

        // Rule ưu tiên cao hơn (Priority 10)
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 2,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Phụ thu cao",
            StartDate = new DateOnly(2026, 10, 1),
            EndDate = new DateOnly(2026, 10, 5),
            AdjustmentType = "FIXED_AMOUNT",
            AdjustmentValue = 300_000m,
            Priority = 10,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 10, 1),
            CheckOutDate = new DateOnly(2026, 10, 2)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        var night = result.RoomSummaries[0].DailyBreakdown[0];
        Assert.Equal(300_000m, night.SurgeAmount);
        Assert.Contains("Phụ thu cao", night.AppliedRule);
    }

    [Fact]
    public async Task Scenario7_RoomPriceHistoryChangesBasePrice_SurgeRuleCalculatedOnNewBasePrice()
    {
        // Lịch sử giá thay đổi BasePrice của hạng phòng lên 1.200.000 VNĐ
        _historyRepo.Histories.Add(new RoomPriceHistory
        {
            PriceHistoryId = 10,
            RoomTypeId = 101,
            Price = 1_200_000m,
            EffectiveFrom = new DateTime(2026, 11, 1),
            EffectiveTo = new DateTime(2026, 11, 30),
            ChangedByUserId = 1
        });

        // Rule tăng giá +25%
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Ưu đãi mùa đông",
            StartDate = new DateOnly(2026, 11, 5),
            EndDate = new DateOnly(2026, 11, 10),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 25m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 6)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        var night = result.RoomSummaries[0].DailyBreakdown[0];
        Assert.Equal(1_200_000m, night.BasePrice);
        Assert.Equal("History", night.RateSource);
        Assert.Equal(300_000m, night.SurgeAmount); // 25% của 1.200.000
        Assert.Equal(1_500_000m, night.FinalNightlyPrice);
    }

    [Fact]
    public async Task Scenario8_MultipleNights_WithDifferentBasePricesFromHistory()
    {
        // Đêm 1: BasePrice gốc 1.000.000 (chưa đến hạn lịch sử)
        // Đêm 2: BasePrice đổi sang 1.400.000 từ 2026-12-02
        _historyRepo.Histories.Add(new RoomPriceHistory
        {
            PriceHistoryId = 20,
            RoomTypeId = 101,
            Price = 1_400_000m,
            EffectiveFrom = new DateTime(2026, 12, 2),
            EffectiveTo = null,
            ChangedByUserId = 1
        });

        // Rule phụ thu 100.000 VNĐ cố định mỗi đêm
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Mùa lễ hội",
            StartDate = new DateOnly(2026, 12, 1),
            EndDate = new DateOnly(2026, 12, 5),
            AdjustmentType = "FIXED_AMOUNT",
            AdjustmentValue = 100_000m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 12, 1),
            CheckOutDate = new DateOnly(2026, 12, 3)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        var breakdown = result.RoomSummaries[0].DailyBreakdown;
        // Đêm 1: 1.000.000 + 100.000 = 1.100.000
        Assert.Equal(1_000_000m, breakdown[0].BasePrice);
        Assert.Equal(1_100_000m, breakdown[0].FinalNightlyPrice);

        // Đêm 2: 1.400.000 + 100.000 = 1.500.000
        Assert.Equal(1_400_000m, breakdown[1].BasePrice);
        Assert.Equal(1_500_000m, breakdown[1].FinalNightlyPrice);

        Assert.Equal(2_600_000m, result.SubTotal);
    }

    [Fact]
    public async Task Scenario9_SingleNightStay_CalculatesCorrectly()
    {
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Đêm lễ",
            StartDate = new DateOnly(2026, 10, 31),
            EndDate = new DateOnly(2026, 10, 31),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 50m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 10, 31),
            CheckOutDate = new DateOnly(2026, 11, 1)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        Assert.Equal(1, result.NumberOfNights);
        Assert.Equal(1_500_000m, result.SubTotal);
        Assert.Single(result.RoomSummaries[0].DailyBreakdown);
    }

    [Fact]
    public async Task Scenario10_CheckOutNight_IsNotCharged()
    {
        // Rule áp dụng cả ngày 30 và 31
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Cuối tuần",
            StartDate = new DateOnly(2026, 10, 30),
            EndDate = new DateOnly(2026, 10, 31),
            AdjustmentType = "PERCENTAGE",
            AdjustmentValue = 20m,
            Priority = 1,
            IsActive = true
        });

        // Khách check-in 29/10, check-out 30/10 -> Chỉ ở đúng 1 đêm 29/10 (ngày thường)
        // Ngày 30 là ngày trả phòng, không tính tiền đêm 30
        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 10, 29),
            CheckOutDate = new DateOnly(2026, 10, 30)
        };

        var result = await _service.CalculateStayPriceAsync(request);

        Assert.Equal(1, result.NumberOfNights);
        Assert.Equal(1_000_000m, result.SubTotal);
        var night = Assert.Single(result.RoomSummaries[0].DailyBreakdown);
        Assert.Equal(new DateOnly(2026, 10, 29), night.StayDate);
        Assert.Equal(0m, night.SurgeAmount);
    }

    [Fact]
    public async Task Scenario11_SurgeRuleOnlyInMiddleOfStay_FirstAndLastNightsAreBasePrice()
    {
        // Rule chỉ có hiệu lực ở 2 đêm giữa kỳ (ngày 3 và 4)
        _surgeRepo.Rules.Add(new PriceSurgeRule
        {
            RuleId = 1,
            HotelId = 1,
            RoomTypeId = 101,
            RuleName = "Đỉnh điểm lễ",
            StartDate = new DateOnly(2026, 10, 3),
            EndDate = new DateOnly(2026, 10, 4),
            AdjustmentType = "FIXED_AMOUNT",
            AdjustmentValue = 200_000m,
            Priority = 1,
            IsActive = true
        });

        var request = new PriceCalculationRequest
        {
            HotelId = 1,
            RoomIds = new List<long> { 1001 },
            CheckInDate = new DateOnly(2026, 10, 1),
            CheckOutDate = new DateOnly(2026, 10, 6) // 5 đêm: 1, 2, 3, 4, 5
        };

        var result = await _service.CalculateStayPriceAsync(request);

        var list = result.RoomSummaries[0].DailyBreakdown;
        Assert.Equal(5, list.Count);
        Assert.Equal(0m, list[0].SurgeAmount);       // Đêm 1: thường
        Assert.Equal(0m, list[1].SurgeAmount);       // Đêm 2: thường
        Assert.Equal(200_000m, list[2].SurgeAmount); // Đêm 3: tăng giá
        Assert.Equal(200_000m, list[3].SurgeAmount); // Đêm 4: tăng giá
        Assert.Equal(0m, list[4].SurgeAmount);       // Đêm 5: thường
    }

    [Fact]
    public async Task Scenario12_RoomBelongsToDifferentHotel_ThrowsArgumentException()
    {
        // Phòng 2002 thuộc HotelId = 2
        _historyRepo.RoomDetails[2002] = (102, 2, "Superior City View", 800_000m);

        var request = new PriceCalculationRequest
        {
            HotelId = 1, // Khách sạn yêu cầu là 1 nhưng phòng thuộc khách sạn 2
            RoomIds = new List<long> { 2002 },
            CheckInDate = new DateOnly(2026, 10, 1),
            CheckOutDate = new DateOnly(2026, 10, 2)
        };

        await Assert.ThrowsAsync<ArgumentException>(() => _service.CalculateStayPriceAsync(request));
    }
}
