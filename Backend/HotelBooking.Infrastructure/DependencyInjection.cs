using HotelBooking.Application.Rooms;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace HotelBooking.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<HotelBookingDbContext>(options => options.UseSqlServer(
            configuration.GetConnectionString("HotelBooking") ?? throw new InvalidOperationException("Configure ConnectionStrings:HotelBooking.")));
        services.AddScoped<IRoomRepository, RoomRepository>();
        return services;
    }
}
