using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public class HotelBookingDBContext : DbContext
{
    public HotelBookingDBContext(DbContextOptions<HotelBookingDBContext> options) : base(options)
    {
    }

    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingDetail> BookingDetails => Set<BookingDetail>();
    public DbSet<BookingGuest> BookingGuests => Set<BookingGuest>();
    public DbSet<BookingStatusHistory> BookingStatusHistory => Set<BookingStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HotelBookingDBContext).Assembly);
    }
}
