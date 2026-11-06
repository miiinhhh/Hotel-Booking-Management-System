namespace HotelBooking.Application.Services;

using HotelBooking.Application.DTOs.Cancellation;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;

public class CancellationPolicyService : ICancellationPolicyService
{
    private readonly ICancellationPolicyRepository _policyRepository;

    public CancellationPolicyService(ICancellationPolicyRepository policyRepository)
    {
        _policyRepository = policyRepository;
    }

    public async Task<CancellationPolicyDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _policyRepository.GetByIdAsync(id, ct);
        return entity == null ? null : MapToDto(entity);
    }

    public async Task<IReadOnlyList<CancellationPolicyDto>> GetByHotelIdAsync(int hotelId, bool activeOnly = false, CancellationToken ct = default)
    {
        var list = await _policyRepository.GetByHotelIdAsync(hotelId, activeOnly, ct);
        return list.Select(MapToDto).ToList();
    }

    public async Task<CancellationPolicyDto> CreatePolicyAsync(CreateCancellationPolicyRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request.PolicyName, request.DaysBeforeCheckIn, request.RefundPercentage, request.DepositPenaltyPercentage);

        if (request.IsActive && await _policyRepository.HasConflictAsync(request.HotelId, request.DaysBeforeCheckIn, null, ct))
        {
            throw new InvalidOperationException($"Chính sách kích hoạt cho mốc {request.DaysBeforeCheckIn} ngày trước nhận phòng đã tồn tại trong khách sạn này.");
        }

        var policy = new CancellationPolicy
        {
            HotelId = request.HotelId,
            PolicyName = request.PolicyName.Trim(),
            DaysBeforeCheckIn = request.DaysBeforeCheckIn,
            RefundPercentage = request.RefundPercentage,
            DepositPenaltyPercentage = request.DepositPenaltyPercentage,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _policyRepository.AddAsync(policy, ct);
        await _policyRepository.SaveChangesAsync(ct);
        return MapToDto(created);
    }

    public async Task<CancellationPolicyDto> UpdatePolicyAsync(int id, UpdateCancellationPolicyRequest request, CancellationToken ct = default)
    {
        var policy = await _policyRepository.GetByIdAsync(id, ct)
            ?? throw new KeyNotFoundException($"Không tìm thấy chính sách hủy phòng với ID: {id}");

        ValidateRequest(request.PolicyName, request.DaysBeforeCheckIn, request.RefundPercentage, request.DepositPenaltyPercentage);

        if (request.IsActive && await _policyRepository.HasConflictAsync(policy.HotelId, request.DaysBeforeCheckIn, id, ct))
        {
            throw new InvalidOperationException($"Chính sách kích hoạt cho mốc {request.DaysBeforeCheckIn} ngày trước nhận phòng đã tồn tại trong khách sạn này.");
        }

        policy.PolicyName = request.PolicyName.Trim();
        policy.DaysBeforeCheckIn = request.DaysBeforeCheckIn;
        policy.RefundPercentage = request.RefundPercentage;
        policy.DepositPenaltyPercentage = request.DepositPenaltyPercentage;
        policy.IsActive = request.IsActive;
        policy.UpdatedAt = DateTime.UtcNow;

        await _policyRepository.UpdateAsync(policy, ct);
        await _policyRepository.SaveChangesAsync(ct);
        return MapToDto(policy);
    }

    public async Task DeletePolicyAsync(int id, CancellationToken ct = default)
    {
        var policy = await _policyRepository.GetByIdAsync(id, ct);
        if (policy != null)
        {
            await _policyRepository.DeleteAsync(policy, ct);
            await _policyRepository.SaveChangesAsync(ct);
        }
    }

    public async Task<CancellationPolicy?> GetApplicablePolicyAsync(int hotelId, int daysRemaining, CancellationToken ct = default)
    {
        if (daysRemaining < 0)
        {
            return null;
        }

        var activePolicies = await _policyRepository.GetByHotelIdAsync(hotelId, activeOnly: true, ct);
        if (activePolicies == null || activePolicies.Count == 0)
        {
            return null;
        }

        var eligiblePolicies = activePolicies
            .Where(p => p.DaysBeforeCheckIn <= daysRemaining)
            .ToList();

        if (eligiblePolicies.Count == 0)
        {
            return null;
        }

        // Chọn mốc DaysBeforeCheckIn lớn nhất sát với ngày check-in nhất
        var maxDays = eligiblePolicies.Max(p => p.DaysBeforeCheckIn);
        var candidates = eligiblePolicies.Where(p => p.DaysBeforeCheckIn == maxDays).ToList();

        // Xử lý conflict/ambiguity: nếu có nhiều policy cùng DaysBeforeCheckIn, chọn cái có lợi nhất cho khách (RefundPercentage cao nhất)
        return candidates.OrderByDescending(p => p.RefundPercentage).First();
    }

    public CancelPreviewResponseDto CalculateCancellation(Booking booking, decimal totalPaid, CancellationPolicy? policy)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysRemaining = booking.CheckInDate.DayNumber - today.DayNumber;

        decimal refundPercentage;
        decimal penaltyPercentage;
        string policyName;
        int? policyDays = null;

        if (policy != null)
        {
            refundPercentage = Math.Clamp(policy.RefundPercentage, 0m, 100m);
            penaltyPercentage = Math.Clamp(policy.DepositPenaltyPercentage, 0m, 100m);
            policyName = policy.PolicyName;
            policyDays = policy.DaysBeforeCheckIn;
        }
        else
        {
            refundPercentage = 0m;
            penaltyPercentage = 100m;
            policyName = daysRemaining < 0
                ? "Không hoàn tiền (Đã quá ngày nhận phòng)"
                : "Không hoàn tiền (Không áp dụng chính sách hoàn hủy)";
        }

        var normalizedPaid = Math.Max(0m, totalPaid);
        decimal refundAmount = 0m;
        decimal penaltyAmount = 0m;

        if (normalizedPaid > 0m)
        {
            refundAmount = Math.Clamp(Math.Round(normalizedPaid * (refundPercentage / 100m), 2), 0m, normalizedPaid);
            penaltyAmount = Math.Clamp(normalizedPaid - refundAmount, 0m, normalizedPaid);
        }

        bool isEligible = refundAmount > 0m;
        string message = isEligible
            ? $"Đơn phòng đủ điều kiện hoàn trả {refundPercentage}% số tiền đã thanh toán ({refundAmount:N0} VNĐ). Phí phạt hủy: {penaltyAmount:N0} VNĐ."
            : (normalizedPaid > 0m
                ? $"Đơn phòng không được hoàn tiền theo chính sách hủy ({penaltyPercentage}% phí phạt: {penaltyAmount:N0} VNĐ)."
                : "Đơn phòng chưa phát sinh thanh toán, không cần hoàn tiền.");

        return new CancelPreviewResponseDto
        {
            BookingId = booking.BookingId,
            BookingCode = booking.BookingCode,
            CheckInDate = booking.CheckInDate,
            CheckOutDate = booking.CheckOutDate,
            DaysRemaining = daysRemaining,
            TotalAmount = booking.TotalAmount,
            TotalPaid = normalizedPaid,
            AppliedPolicyName = policyName,
            PolicyDaysBeforeCheckIn = policyDays,
            RefundPercentage = refundPercentage,
            RefundAmount = refundAmount,
            PenaltyPercentage = penaltyPercentage,
            PenaltyAmount = penaltyAmount,
            IsEligibleForRefund = isEligible,
            Message = message
        };
    }

    private static void ValidateRequest(string name, int daysBeforeCheckIn, decimal refundPercentage, decimal penaltyPercentage)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Tên chính sách hủy không được để trống.");
        }

        if (daysBeforeCheckIn < 0)
        {
            throw new ArgumentException("Số ngày trước nhận phòng (DaysBeforeCheckIn) phải lớn hơn hoặc bằng 0.");
        }

        if (refundPercentage < 0 || refundPercentage > 100)
        {
            throw new ArgumentException("Tỷ lệ hoàn tiền phải nằm trong khoảng từ 0 đến 100.");
        }

        if (penaltyPercentage < 0 || penaltyPercentage > 100)
        {
            throw new ArgumentException("Tỷ lệ phạt hủy phải nằm trong khoảng từ 0 đến 100.");
        }
    }

    private static CancellationPolicyDto MapToDto(CancellationPolicy entity)
    {
        return new CancellationPolicyDto
        {
            CancellationPolicyId = entity.CancellationPolicyId,
            HotelId = entity.HotelId,
            PolicyName = entity.PolicyName,
            DaysBeforeCheckIn = entity.DaysBeforeCheckIn,
            RefundPercentage = entity.RefundPercentage,
            DepositPenaltyPercentage = entity.DepositPenaltyPercentage,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }
}
