using System.Security.Claims;
using HotelBooking.Application.DTOs.Staff;
using HotelBooking.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
public class StaffAreaAssignmentsController : ControllerBase
{
    private readonly IStaffAreaAssignmentService _assignmentService;

    public StaffAreaAssignmentsController(IStaffAreaAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    /// <summary>
    /// Lấy danh sách toàn bộ nhân viên và các phân khu phụ trách theo từng khách sạn (Dành cho Admin/Quản lý)
    /// </summary>
    [HttpGet("api/hotels/{hotelId:int}/staff-assignments")]
    public async Task<IActionResult> GetHotelStaffAssignments([FromRoute] int hotelId, CancellationToken ct)
    {
        var result = await _assignmentService.GetHotelStaffAssignmentsAsync(hotelId, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách toàn bộ phân khu (Zone/Building) của khách sạn kèm thống kê phòng
    /// </summary>
    [HttpGet("api/hotels/{hotelId:int}/staff-assignments/areas")]
    public async Task<IActionResult> GetHotelAreas([FromRoute] int hotelId, CancellationToken ct)
    {
        var result = await _assignmentService.GetHotelAreasAsync(hotelId, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đồng bộ phân công phân khu cho một nhân viên (Thêm mới, kích hoạt lại hoặc hủy phân công các phân khu bị bỏ chọn)
    /// </summary>
    [HttpPut("api/hotels/{hotelId:int}/staff-assignments/sync")]
    public async Task<IActionResult> SyncStaffAreas(
        [FromRoute] int hotelId,
        [FromBody] AssignStaffAreasRequest request,
        CancellationToken ct)
    {
        long? currentUserId = TryGetCurrentUserId();
        var result = await _assignmentService.SyncStaffAreasAsync(hotelId, request, currentUserId, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Hủy quyền phụ trách một phân khu cụ thể
    /// </summary>
    [HttpDelete("api/hotels/{hotelId:int}/staff-assignments/{assignmentId:long}")]
    public async Task<IActionResult> RemoveAssignment(
        [FromRoute] int hotelId,
        [FromRoute] long assignmentId,
        CancellationToken ct)
    {
        var result = await _assignmentService.RemoveAssignmentAsync(hotelId, assignmentId, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách các phân khu mà nhân sự đang đăng nhập phụ trách (Dành cho Staff Portal - Active Zone)
    /// </summary>
    [HttpGet("api/staff/me/assigned-areas")]
    public async Task<IActionResult> GetMyAssignedAreas(
        [FromQuery] int? hotelId,
        [FromQuery] long? userId,
        CancellationToken ct)
    {
        long effectiveUserId = userId ?? TryGetCurrentUserId() ?? 0;
        if (effectiveUserId <= 0)
        {
            return BadRequest(new { success = false, message = "Không xác định được danh tính nhân viên. Vui lòng đăng nhập hoặc cung cấp userId." });
        }

        var result = await _assignmentService.GetMyAssignedAreasAsync(effectiveUserId, hotelId, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    private long? TryGetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value
                    ?? User.FindFirst("userId")?.Value;

        if (long.TryParse(claim, out var id))
        {
            return id;
        }

        return null;
    }
}
