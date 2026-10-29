using System.Text.RegularExpressions;
using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using Microsoft.Extensions.Configuration;
using SkiaSharp;

namespace HotelBooking.Infrastructure.Persistence;

public sealed class LocalImageStorage : IImageStorage
{
    public const long MaxFileBytes = 5 * 1024 * 1024;
    private readonly string root;
    public LocalImageStorage(IConfiguration configuration)
    {
        // Keep files outside wwwroot: all reads pass through scoped API checks.
        root = Path.GetFullPath(configuration["ImageStorage:LocalRoot"] ?? Path.Combine(AppContext.BaseDirectory, "uploads"));
    }
    private string FilePath(string key)
    {
        if (!Regex.IsMatch(key, "\\A[a-f0-9]{32}\\.(jpg|png|webp)\\z", RegexOptions.CultureInvariant))
            throw new DomainRuleException("Invalid image storage key.");
        return Path.Combine(root, key);
    }
    public async Task<StoredImage> StoreAsync(ImageUpload upload, CancellationToken ct)
    {
        if (upload.Length <= 0 || upload.Length > MaxFileBytes)
            throw new DomainRuleException("Image size must be between 1 byte and 5 MiB.");
        var fileName = Path.GetFileName(upload.FileName.Replace('\\', '/'));
        if (fileName.Length is < 1 or > 255) throw new DomainRuleException("Invalid file name.");
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var expected = extension switch { ".jpg" or ".jpeg" => "image/jpeg", ".png" => "image/png", ".webp" => "image/webp", _ => null };
        if (expected is null || !string.Equals(upload.ContentType, expected, StringComparison.OrdinalIgnoreCase))
            throw new DomainRuleException("Only matching JPEG, PNG or WebP files and MIME types are accepted.");
        using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        int read;
        while ((read = await upload.Content.ReadAsync(chunk, ct)) > 0)
        {
            if (buffer.Length + read > MaxFileBytes) throw new DomainRuleException("Image exceeds 5 MiB.");
            await buffer.WriteAsync(chunk.AsMemory(0, read), ct);
        }
        if (buffer.Length != upload.Length) throw new DomainRuleException("Image length does not match the upload.");
        try
        {
            buffer.Position = 0;
            using var codec = SKCodec.Create(buffer) ?? throw new DomainRuleException("Invalid image contents.");
            var actual = codec.EncodedFormat switch
            {
                SKEncodedImageFormat.Jpeg => "image/jpeg",
                SKEncodedImageFormat.Png => "image/png",
                SKEncodedImageFormat.Webp => "image/webp",
                _ => null
            };
            if (actual != expected) throw new DomainRuleException("Image contents do not match the declared format.");
            var info = codec.Info;
            if (info.Width <= 0 || info.Height <= 0 || info.Width > 8000 || info.Height > 8000 || (long)info.Width * info.Height > 24_000_000)
                throw new DomainRuleException("Image dimensions exceed 8000 pixels or 24 megapixels.");
            using var bitmap = new SKBitmap(info.Width, info.Height, SKColorType.Rgba8888, SKAlphaType.Premul);
            if (codec.GetPixels(bitmap.Info, bitmap.GetPixels()) != SKCodecResult.Success)
                throw new DomainRuleException("Image is damaged or incomplete.");
            using var image = SKImage.FromBitmap(bitmap);
            using var encodedData = image.Encode(codec.EncodedFormat, 90)
                ?? throw new DomainRuleException("Image cannot be encoded.");
            using var encoded = new MemoryStream();
            encodedData.SaveTo(encoded);
            if (expected == "image/jpeg") extension = ".jpg";
            if (encoded.Length > MaxFileBytes) throw new DomainRuleException("Processed image exceeds 5 MiB.");
            var key = Guid.NewGuid().ToString("N") + extension;
            Directory.CreateDirectory(root);
            var path = FilePath(key);
            try
            {
                await using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true);
                encoded.Position = 0;
                await encoded.CopyToAsync(output, ct);
            }
            catch { File.Delete(path); throw; }
            return new StoredImage(key, "", fileName, expected, encoded.Length, info.Width, info.Height);
        }
        catch (NotSupportedException) { throw new DomainRuleException("Unsupported image encoding."); }
    }
    public Task<ImageFile> OpenAsync(string key, string contentType, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        try
        {
            Stream stream = new FileStream(FilePath(key), FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete, 81920, true);
            return Task.FromResult(new ImageFile(stream, contentType));
        }
        catch (FileNotFoundException) { throw new NotFoundException("Image file not found."); }
        catch (DirectoryNotFoundException) { throw new NotFoundException("Image file not found."); }
    }
    public Task DeleteAsync(string key, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        File.Delete(FilePath(key));
        return Task.CompletedTask;
    }
}
