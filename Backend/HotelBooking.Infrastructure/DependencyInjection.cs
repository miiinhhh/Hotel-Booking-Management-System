using HotelBooking.Application.Hotels;
using HotelBooking.Infrastructure.Persistence;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddHotelInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("HotelDatabase")
            ?? throw new InvalidOperationException("Thiếu ConnectionStrings:HotelDatabase.");
        services.AddDbContext<HotelDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped<IHotelRepository, HotelRepository>();
        return services;
    }
}
