using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/[controller]")] // để sau này các controller con kế thừa sẽ có route chung là api/controllername
public abstract class BaseAPIController : ControllerBase
{
    
}