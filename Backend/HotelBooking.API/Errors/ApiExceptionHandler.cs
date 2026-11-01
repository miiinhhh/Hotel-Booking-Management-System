using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Auth;
namespace HotelBooking.API.Errors;

public sealed class ApiExceptionHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is ReauthenticationRequiredException)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return await problems.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails = AuthenticationProblems.Create(context, StatusCodes.Status401Unauthorized,
                    "AUTH_REAUTHENTICATION_REQUIRED", "Reauthentication required", exception.Message)
            });
        }
        if (exception is HotelBooking.Application.Interfaces.ContentAccessDeniedException or UnauthorizedAccessException or HotelBooking.Application.Staff.StaffAccessDeniedException or InventoryAccessException)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return await problems.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails = AuthenticationProblems.Forbidden(context, exception.Message)
            });
        }

        var status = exception switch
        {
            NotFoundException => 404,
            ConflictException or DuplicateEmailException or DuplicatePhoneException => 409,
            DomainRuleException => 400,
            _ => 0
        };
        if (status == 0) return false;
        context.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails { Status = status, Title = exception.Message }
        });
    }
}
