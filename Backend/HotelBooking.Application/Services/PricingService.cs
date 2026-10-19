using HotelBooking.Application.DTOs.Pricing;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Services;

public class PricingService : IPricingService
{
    private readonly IRoomPriceHistoryRepository _repository;

    public PricingService(IRoomPriceHistoryRepository repository)
    {
        _repository = repository;
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
        var roomDetails = await _repository.GetRoomDetailsForPricingAsync(request.RoomIds, ct);
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

        // Số đêm lưu trú: [CheckInDate, CheckOutDate), ngày trả phòng không tính là một đêm lưu trú
        int numberOfNights = request.CheckOutDate.DayNumber - request.CheckInDate.DayNumber;

        // Lấy lịch sử giá theo từng loại phòng để áp dụng giá theo ngày
        var distinctRoomTypeIds = roomDetails.Values.Select(v => v.RoomTypeId).Distinct().ToList();
        var historiesByRoomType = new Dictionary<int, IReadOnlyList<RoomPriceHistory>>();
        foreach (var typeId in distinctRoomTypeIds)
        {
            historiesByRoomType[typeId] = await _repository.GetHistoriesByRoomTypeAsync(typeId, ct);
        }

        decimal totalSubTotal = 0m;
        var roomSummaries = new List<RoomStayPriceSummaryDto>();

        // 2. Tính giá từng đêm dựa trên RoomPriceHistory (ưu tiên) hoặc RoomTypes.BasePrice
        foreach (var roomId in request.RoomIds)
        {
            var (roomTypeId, _, basePrice) = roomDetails[roomId];
            var typeHistories = historiesByRoomType.GetValueOrDefault(roomTypeId, Array.Empty<RoomPriceHistory>());
            var dailyBreakdown = new List<DailyPriceBreakdownDto>();
            decimal roomSubTotal = 0m;

            for (int i = 0; i < numberOfNights; i++)
            {
                var stayDate = request.CheckInDate.AddDays(i);
                var stayDateTime = stayDate.ToDateTime(TimeOnly.MinValue);

                var matchedHistory = typeHistories.FirstOrDefault(h =>
                    h.EffectiveFrom <= stayDateTime &&
                    (!h.EffectiveTo.HasValue || h.EffectiveTo.Value >= stayDateTime));

                decimal nightlyPrice;
                string rateSource;

                if (matchedHistory != null)
                {
                    nightlyPrice = matchedHistory.Price;
                    rateSource = "History";
                }
                else
                {
                    nightlyPrice = basePrice;
                    rateSource = "BasePrice";
                }

                roomSubTotal += nightlyPrice;

                dailyBreakdown.Add(new DailyPriceBreakdownDto
                {
                    RoomId = roomId,
                    RoomTypeId = roomTypeId,
                    StayDate = stayDate,
                    NightlyPrice = nightlyPrice,
                    RateSource = rateSource
                });
            }

            totalSubTotal += roomSubTotal;

            roomSummaries.Add(new RoomStayPriceSummaryDto
            {
                RoomId = roomId,
                RoomTypeId = roomTypeId,
                NumberOfNights = numberOfNights,
                SubTotal = roomSubTotal,
                AverageUnitPrice = numberOfNights > 0 ? Math.Round(roomSubTotal / numberOfNights, 2) : basePrice,
                DailyBreakdown = dailyBreakdown
            });
        }

        // 3. Phụ phí check-in sớm / check-out muộn:
        // Đồng bộ với BookingServices hiện tại (FeeAmount mặc định = 0m khi chưa có chính sách phụ phí chính thức)
        decimal feeAmount = 0m;
        string? feeDescription = null;

        var policy = await _repository.GetHotelCheckInOutPolicyAsync(request.HotelId, ct);
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

        // 4. Đồng bộ công thức thuế và cọc với BookingServices
        decimal estimatedTax = Math.Round(totalSubTotal * 0.10m, 2); // 10% VAT
        decimal estimatedTotal = totalSubTotal + feeAmount + estimatedTax;
        decimal estimatedDeposit = Math.Round(estimatedTotal * 0.30m, 2); // 30% cọc nếu chọn Deposit

        return new PriceCalculationResultDto
        {
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
        var list = await _repository.GetHistoriesByRoomTypeAsync(roomTypeId, ct);
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

        var created = await _repository.AddHistoryAsync(history, ct);

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
}
