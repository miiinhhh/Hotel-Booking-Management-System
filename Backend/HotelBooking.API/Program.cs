    using System.Data;
    using Microsoft.Data.SqlClient;
    using HotelBooking.Application.Interfaces;
    using HotelBooking.Application.Services;
    using HotelBooking.Infrastructure.Repositories;

    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddControllers();

    builder.Services.AddScoped<IDbConnection>(sp =>
    {
        var configuration = sp.GetRequiredService<IConfiguration>();

        var connectionString = configuration.GetConnectionString("DefaultConnection");

        return new SqlConnection(connectionString);
    });

    builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
    builder.Services.AddScoped<IPaymentService, PaymentService>();

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();

    app.MapControllers();

    app.Run();