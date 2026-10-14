using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Application.Rooms;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IBookingService, BookingServices>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IRoomSearchService, RoomSearchService>();

        return services;
    }
}
