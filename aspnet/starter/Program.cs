using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorPages();

var issuer = builder.Configuration["EarthId:Issuer"]?.TrimEnd('/');
var clientId = builder.Configuration["EarthId:ClientId"];
var clientSecret = builder.Configuration["EarthId:ClientSecret"];

if (string.IsNullOrWhiteSpace(issuer) ||
    string.IsNullOrWhiteSpace(clientId) ||
    string.IsNullOrWhiteSpace(clientSecret))
{
    throw new InvalidOperationException(
        "Configure EarthId:Issuer, EarthId:ClientId and EarthId:ClientSecret via dotnet user-secrets or protected environment variables.");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
    })
    .AddOpenIdConnect(options =>
    {
        // Issuer is deployment-specific. Read the protocol endpoints from discovery.
        options.Authority = issuer;
        options.MetadataAddress = issuer + "/.well-known/openid-configuration";
        options.RequireHttpsMetadata = true;
        options.ClientId = clientId;
        options.ClientSecret = clientSecret;
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.UsePkce = true;
        options.SaveTokens = true; // Encrypted authentication ticket; needed for RP-initiated logout.
        options.GetClaimsFromUserInfoEndpoint = true;
        options.MapInboundClaims = false;
        options.CallbackPath = "/signin-oidc";
        options.SignedOutCallbackPath = "/signout-callback-oidc";
        options.SignedOutRedirectUri = "/";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            NameClaimType = "name"
        };

        options.Scope.Clear();
        options.Scope.Add("openid");
        options.Scope.Add("profile");
        options.Scope.Add("email");
        options.ClaimActions.MapUniqueJsonKey("name", "name");
        options.ClaimActions.MapUniqueJsonKey("email", "email");
    });

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// The redirect is fixed: never reflect arbitrary returnUrl from a query string.
app.MapGet("/login", () => Results.Challenge(
    new AuthenticationProperties { RedirectUri = "/Profile" },
    [OpenIdConnectDefaults.AuthenticationScheme]));

app.MapRazorPages();
app.Run();
