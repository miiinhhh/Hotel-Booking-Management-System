using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Application.Rooms;
using HotelBooking.Application.Areas;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IBookingService, BookingServices>();
        services.AddScoped<RoomInventoryService>();
        services.AddScoped<HotelBooking.Application.Staff.StaffService>();
        services.AddScoped<IBookingPricingService, BookingPricingService>();
        services.AddScoped<IStaffAreaAssignmentService, StaffAreaAssignmentService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IRoomSearchService, RoomSearchService>();
        services.AddScoped<IPropertyContentService, PropertyContentService>();
        services.AddScoped<HotelAreaService>();
        services.AddScoped<DiscoveryService>();

        return services;
    }
}
