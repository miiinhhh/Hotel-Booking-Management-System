using HotelBookingDbContext = HotelBooking.Infrastructure.Data.HotelBookingDbContext;
using HotelBooking.API.ExceptionHandling;
using HotelBooking.Application.Hotels;
using System.Text;
using HotelBooking.Application.Auth;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Security;
using HotelBooking.Application;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

using System.Text.Json.Serialization;
using HotelBooking.API.Errors;
using HotelBooking.Application.Rooms;
using HotelBooking.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
    builder.Configuration.AddEnvironmentVariables();
    builder.Configuration.AddCommandLine(args);
}

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo
    {
        Title = "Hotel Booking Management API",
        Version = "v1",
        Description = "API documentation for Hotel Booking Management System"
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.ParameterLocation.Header,
        Description = "Nhập token JWT theo định dạng: Bearer {token}"
    });

    c.AddSecurityRequirement(doc => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", doc, null),
            new List<string>()
        }
    });
});
builder.Services.AddProblemDetails();
var connectionString = builder.Configuration.GetConnectionString("HotelBooking")
    ?? throw new InvalidOperationException(
        "Configure ConnectionStrings:HotelBooking.");
builder.Services.AddDbContext<HotelBookingDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration is missing.");
if (Encoding.UTF8.GetByteCount(jwt.SecretKey) < 32)
    throw new InvalidOperationException("Jwt:SecretKey must be at least 32 characters.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SecretKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.Security.Claims.ClaimTypes.Name
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddScoped<ITokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));
builder.Services.AddScoped<IHotelService, HotelService>();
builder.Services.AddHotelInfrastructure(builder.Configuration);
builder.Services.AddExceptionHandler<HotelExceptionHandler>();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddApplicationServices();
builder.Services.AddScoped<RoomService>();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendClient", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();
app.UseExceptionHandler();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hotel Booking API v1");
        c.RoutePrefix = "swagger";
    });
}
app.UseHttpsRedirection();
app.UseCors("FrontendClient");
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    await RoleSeeder.SeedAsync(scope.ServiceProvider);
}

app.MapControllers();

app.Run();
public partial class Program { }
