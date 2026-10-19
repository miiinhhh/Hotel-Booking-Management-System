using HotelBooking.Application.Hotels;
using HotelBooking.Infrastructure.Persistence;
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
        services.AddScoped<IRoomSearchRepository, RoomSearchRepository>();

        // Module Booking
        services.AddDbContext<BookingDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IRoomPriceHistoryRepository, RoomPriceHistoryRepository>();

        // Module Payment
        services.AddScoped<System.Data.IDbConnection>(_ =>
            new Microsoft.Data.SqlClient.SqlConnection(connectionString));

        services.AddScoped<IPaymentRepository, PaymentRepository>();

        return services;
    }
    public static IServiceCollection AddHotelInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("HotelBooking")
            ?? throw new InvalidOperationException("Thiếu ConnectionStrings:HotelBooking.");
        services.AddDbContext<HotelDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IHotelRepository, HotelRepository>();
        return services;
    }
}
