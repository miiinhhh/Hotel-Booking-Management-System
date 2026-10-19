using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IBookingService, BookingServices>();
        services.AddScoped<IBookingPricingService, BookingPricingService>();
        services.AddScoped<IStaffAreaAssignmentService, StaffAreaAssignmentService>();

        return services;
    }
}
