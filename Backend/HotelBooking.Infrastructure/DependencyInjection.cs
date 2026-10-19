using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using RoomDbContext =
    HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using BookingDbContext =
    HotelBooking.Infrastructure.Data.HotelBookingDBContext;
using RoomRepository =
    HotelBooking.Infrastructure.Persistence.RoomRepository;

namespace HotelBooking.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("HotelBooking")
            ?? throw new InvalidOperationException(
                "Configure ConnectionStrings:HotelBooking.");

        // Module Room / RoomType
        services.AddDbContext<RoomDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<IRoomRepository, RoomRepository>();

        // Module Booking
        services.AddDbContext<BookingDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IVoucherRepository, VoucherRepository>();

        return services;
    }
}
