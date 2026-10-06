using HotelBooking.Application;
using HotelBooking.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 1. GỌI DI TỪ CÁC TẦNG KHÁC (Application & Infrastructure)
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. CẤU HÌNH API & CONTROLLER
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); 
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

// 3. CẤU HÌNH PIPELINE
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

// 4. MAP CONTROLLER
app.MapControllers();

app.Run();