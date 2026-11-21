namespace HotelBooking.Application.DTOs.Booking;

public class RescheduleBookingRequest
{
    public DateOnly NewCheckInDate { get; set; }
    public DateOnly NewCheckOutDate { get; set; }
    public List<long>? NewRoomIds { get; set; }
    public string? Reason { get; set; }
}

/// <summary>Xem trước kết quả đổi lịch: giá mới và phần chênh lệch so với số đã trả.</summary>
public class ReschedulePreviewDto
{
    public DateOnly OldCheckInDate { get; set; }
    public DateOnly OldCheckOutDate { get; set; }
    public DateOnly NewCheckInDate { get; set; }
    public DateOnly NewCheckOutDate { get; set; }
    public decimal OldTotalAmount { get; set; }
    public decimal NewTotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal NewDepositAmount { get; set; }
    /// <summary>Số còn phải thu khi nhận phòng sau khi đổi.</summary>
    public decimal NewRemainingAmount { get; set; }
    /// <summary>Số khách đã trả vượt tổng tiền mới (cần hoàn/khấu trừ tại quầy).</summary>
    public decimal OverpaidAmount { get; set; }
    public bool RoomsAvailable { get; set; }
}

public class NoShowRequest
{
    public string? Note { get; set; }
}

