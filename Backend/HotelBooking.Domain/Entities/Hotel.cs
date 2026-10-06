using System.Net.Mail;
using HotelBooking.Domain.Exceptions;

namespace HotelBooking.Domain.Entities;

public sealed class Hotel
{
    private Hotel() { } // EF Core materialization.

    public int HotelId { get; private set; }
    public string HotelName { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string Address { get; private set; } = string.Empty;
    public string City { get; private set; } = string.Empty;
    public string Country { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? Website { get; private set; }
    public TimeOnly CheckInTime { get; private set; }
    public TimeOnly CheckOutTime { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    public static Hotel Create(HotelInformation information)
    {
        var hotel = new Hotel();
        hotel.Apply(information);
        hotel.CreatedAt = DateTime.UtcNow;
        return hotel;
    }

    public void Update(HotelInformation information)
    {
        Apply(information);
        UpdatedAt = DateTime.UtcNow;
    }

    private void Apply(HotelInformation information)
    {
        // Validate everything before mutating the entity.
        var name = RequiredText(information.HotelName, 200, nameof(HotelName));
        var address = RequiredText(information.Address, 300, nameof(Address));
        var city = RequiredText(information.City, 100, nameof(City));
        var country = RequiredText(information.Country, 100, nameof(Country));
        var phone = RequiredText(information.Phone, 20, nameof(Phone));
        var email = RequiredText(information.Email, 255, nameof(Email));
        if (!MailAddress.TryCreate(email, out var mail) || mail.Address != email)
            throw new DomainValidationException("Email không hợp lệ.");

        var website = string.IsNullOrWhiteSpace(information.Website) ? null : information.Website.Trim();
        if (website is not null && (website.Length > 500 ||
            !Uri.TryCreate(website, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)))
            throw new DomainValidationException("Website phải là URL http/https, tối đa 500 ký tự.");
        if (information.CheckInTime == information.CheckOutTime)
            throw new DomainValidationException("Giờ check-in và check-out phải khác nhau.");

        HotelName = name;
        Description = string.IsNullOrWhiteSpace(information.Description) ? null : information.Description.Trim();
        Address = address;
        City = city;
        Country = country;
        Phone = phone;
        Email = email;
        Website = website;
        CheckInTime = information.CheckInTime;
        CheckOutTime = information.CheckOutTime;
        IsActive = information.IsActive;
    }

    private static string RequiredText(string? value, int maxLength, string field)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maxLength)
            throw new DomainValidationException($"{field} là bắt buộc, tối đa {maxLength} ký tự.");
        return value.Trim();
    }
}
