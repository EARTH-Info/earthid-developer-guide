using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace EarthIdDemo.Pages;

[Authorize]
public class ProfileModel : PageModel
{
}
