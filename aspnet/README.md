# Integrate EarthID Enterprise with ASP.NET Core

**Audience:** vendor developers building server-rendered ASP.NET Core web applications.

This is an updated, publicly distributable adaptation of the existing [EARTH-Info/earthid-aspnet-guide](https://github.com/EARTH-Info/earthid-aspnet-guide). The older sample demonstrated ASP.NET Core Razor Pages, a cookie-authenticated local session, OIDC Authorization Code + PKCE, a popup callback, and two-step logout. The starter here deliberately simplifies it to a standard full-page redirect (more reliable on mobile) and removes all raw-token display.

**Runtime:** ASP.NET Core **10.0 LTS** (the original sample used .NET 8). It uses the security-patched `Microsoft.AspNetCore.Authentication.OpenIdConnect` 10.0.15 package and a modern supported .NET SDK. **ASP.NET Framework MVC 5 is not covered by this ASP.NET Core example.**

## 1. Understand EarthID, DBKK ID and your app

- **EarthID Enterprise:** IAM / SSO platform.
- **DBKK ID:** one deployment using EarthID.
- **Your ASP.NET app:** OIDC relying party (RP) with its own user session and business authorization.

```text
User → ASP.NET /login → EarthID hosted login
     → ASP.NET /signin-oidc (authorization code)
     → middleware validates ID token, exchanges code, writes secure auth cookie
     → /Profile (protected)
```

EarthID does not automatically grant the user permission to edit, approve, administer or inspect records in your application.

## 2. What you need from the deployment administrator

Request the following **per deployment and environment**, before testing:

| Field | Local example |
| --- | --- |
| Approved issuer | `https://idp.dbkk.my/api/earthid` (provisional example; confirm live discovery) |
| Client type | Confidential web client |
| Client ID | Issued by the deployment administrator |
| Client secret | Delivered through an approved private channel |
| Callback URI | `https://localhost:7043/signin-oidc` |
| Post-logout callback | `https://localhost:7043/signout-callback-oidc` |
| Scopes | `openid profile email` |
| Test account | Authorized non-production identity |

The provisional DBKK issuer above comes from supplied integration notes, **not from a successfully completed live endpoint test**. The exact issuer must equal discovery's `issuer` value. Do not guess a planned future hostname.

Every client redirect must be registered **exactly**, including scheme, port, path and trailing slash. The operator decides permitted post-logout URIs and available scopes.

## 3. Run the included sample

Install the **.NET 10 SDK** and trust your development certificate:

```bash
dotnet dev-certs https --trust
cd aspnet/starter
```

The sample deliberately uses .NET **User Secrets** for local sensitive configuration, rather than publishing a real `.env` file. Run:

```bash
dotnet user-secrets set "EarthId:Issuer" "https://idp.dbkk.my/api/earthid"
dotnet user-secrets set "EarthId:ClientId" "your-approved-client-id"
dotnet user-secrets set "EarthId:ClientSecret" "your-private-client-secret"
dotnet run --launch-profile https
```

Open `https://localhost:7043`. Click **Sign in with EarthID**. Once you authenticate with an approved user, open `/Profile` and confirm the user display name, email (if granted) and `sub`.

Do **not** publish your local user-secrets storage or share your secret in a screenshot, issue or pull request.

The site must run at the same URL and port registered for the client. If the redirect URI is registered only for another port, the IdP will reject it.

### Deployment configuration

In production, supply the same settings as protected environment variables (or an enterprise secret manager):

```text
EarthId__Issuer
EarthId__ClientId
EarthId__ClientSecret
```

Use HTTPS and configure ASP.NET Core Data Protection keys appropriately for multi-instance environments so cookie sessions can be decrypted after restarts and across replicas. Never place live secrets in `appsettings.json` or source control.

## 4. File map

| File | Why it matters |
| --- | --- |
| `starter/Program.cs` | OIDC discovery, code + PKCE, session cookie, security defaults |
| `starter/Pages/Index.cshtml` | Login link, CSRF-protected logout form |
| `starter/Pages/Index.cshtml.cs` | OIDC and cookie sign-out action |
| `starter/Pages/Profile.cshtml` | Safe, Razor-encoded user profile |
| `starter/Pages/Profile.cshtml.cs` | Protected endpoint requiring login |
| `starter/Properties/launchSettings.json` | Local HTTPS origin |

The browser redirects to EarthID for authentication. ASP.NET Core automatically handles `state`/`nonce` and PKCE verification, OIDC discovery, code exchange and ID token validation. It stores an encrypted cookie authentication ticket; the raw tokens are **not rendered to the browser** by the sample.

The sample retains tokens inside its protected authentication ticket to support standard RP-initiated sign-out. For production systems, consider a server-side ticket/session store to reduce cookie size and enable stronger forced logout.

## 5. Claims and application authorization

An authenticated user may carry `sub`, `name` and `email`. The presence and values of any additional claims depend on client registration, scope, deployment policy and the authentication method. Never assume that `nric`, `staff_no`, `department`, `mydigital_verified` or business roles are populated.

Store the external identity as **(issuer, sub)**. Treat the `sub` as opaque, not as an NRIC or email. Your app must enforce its own authorization checks on every business action.

## 6. Logout semantics

The **Sign out** button in this sample invokes ASP.NET Core cookie and OpenID Connect sign-out. Middleware attempts to end the EarthID session using the discovered end-session endpoint and then return via the configured signed-out callback.

Do not declare federation logout successful merely because the local authentication cookie disappeared. The deployment operator must verify exact registered post-logout URIs, `id_token_hint` expectations and single-/multi-application behavior. A second application may require front-/back-channel logout support.

The previous ASP.NET repository also describes a deployment-specific `/logout` route and permissive wildcard matching. **Those are not portable OIDC requirements** and should not be copied as general integration guidance. Prefer metadata-driven OIDC RP-initiated logout; confirm specifics with the deployment administrator.

## 7. Troubleshooting

| Error / symptom | What to check |
| --- | --- |
| `invalid_redirect_uri` | Exact callback `https://localhost:7043/signin-oidc` registered |
| `invalid_client` | Approved client ID/secret for the issuer and correct environment |
| `invalid_grant` | Fresh one-time auth code, matching callback and PKCE |
| Discovery failure | Issuer reachable from server; TLS and discovery issuer correct |
| HTTPS handshake error | `dotnet dev-certs https --trust`, correct port |
| Login works but user denied | Your app authorization, not OIDC authentication |
| Logout fails/returns to login | Registered logout callback and provider session policy |

Avoid logging tokens and personally identifiable claims. For support, share only redacted metadata, status, correlation IDs and a sanitized error description.

## 8. UAT before release

- [ ] New private browser cannot open `/Profile` without login.
- [ ] Approved client signs in through discovery and code+PKCE.
- [ ] A successful callback creates a secure/HttpOnly local cookie.
- [ ] `sub`, name and email are interpreted correctly; no token displayed.
- [ ] Cookies and redirects use HTTPS in staging and production.
- [ ] Logout from ASP.NET clears local access and matches agreed IdP policy.
- [ ] A user without the required role cannot invoke any protected business operation.
- [ ] Auth errors do not disclose credentials or tokens.
- [ ] Prove changes with an approved client and redacted evidence.

**Not yet claimed:** the starter has not been run against a live DBKK client here; successful end-to-end integration requires credentials and the operator's UAT sign-off.

## Original source and technical notes

The [original ASP.NET guide](https://github.com/EARTH-Info/earthid-aspnet-guide) is preserved as historical reference. Its .NET 8 sample printed tokens, favored popup navigation, used deployment-specific JTU endpoints and linked to a local `file:///` path. This adaptation updates the framework version, corrects public guidance and removes those behaviors rather than treating every old implementation choice as a platform requirement.
