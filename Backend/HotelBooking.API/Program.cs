using System.Text.Json.Serialization;
using HotelBooking.API.Errors;
using HotelBooking.Application.Rooms;
using HotelBooking.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddScoped<RoomService>();
builder.Services.AddInfrastructure(builder.Configuration);
var app = builder.Build();
app.UseExceptionHandler();
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseHttpsRedirection();
app.MapControllers();
app.Run();
