using HotelBooking.Application.Hotels;
using HotelBooking.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.ExceptionHandling;

public sealed class HotelExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var statusCode = exception switch
        {
            DomainValidationException => StatusCodes.Status400BadRequest,
            HotelNotFoundException => StatusCodes.Status404NotFound,
            HotelConflictException => StatusCodes.Status409Conflict,
            _ => 0
        };
        if (statusCode == 0) return false;

        httpContext.Response.StatusCode = statusCode;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = statusCode switch { 400 => "Dữ liệu không hợp lệ", 404 => "Không tìm thấy Hotel", _ => "Xung đột dữ liệu Hotel" },
                Detail = exception.Message,
                Instance = httpContext.Request.Path
            }
        });
    }
}
