using Microsoft.AspNetCore.SignalR;

namespace HotelBooking.API.Hubs;

public class BookingHub : Hub
{
    public async Task JoinHotelGroup(int hotelId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Hotel_{hotelId}");
    }

    public async Task LeaveHotelGroup(int hotelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Hotel_{hotelId}");
    }
}

