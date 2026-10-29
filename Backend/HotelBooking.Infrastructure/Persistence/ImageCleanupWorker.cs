using HotelBooking.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelBooking.Infrastructure.Persistence;

public sealed class ImageCleanupWorker(IServiceScopeFactory scopes, ILogger<ImageCleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await CleanupAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogWarning(ex, "Image cleanup unavailable; will retry"); }
        }
    }
    public async Task CleanupAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelBookingDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IImageStorage>();
        var pending = await db.ImageFileDeletions.OrderBy(x => x.Id).Take(50).ToListAsync(ct);
        foreach (var deletion in pending)
        {
            try
            {
                await storage.DeleteAsync(deletion.StorageKey, ct);
                db.ImageFileDeletions.Remove(deletion);
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                db.Entry(deletion).State = EntityState.Unchanged;
                logger.LogWarning(ex, "Will retry image cleanup {DeletionId}", deletion.Id);
            }
        }
    }
}
