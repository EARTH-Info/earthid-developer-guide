# EarthID Enterprise — Developer Integration Guide

Public integration documentation for software vendors building applications that authenticate users through **EarthID Enterprise** using OpenID Connect (OIDC).

EarthID Enterprise provides identity authentication and single sign-on. Your application redirects users to your organization's EarthID Enterprise service, handles the verified OIDC response, and remains responsible for application-specific permissions and business workflows.

## Start here: Authentication vs Authorization

**Who authenticates the user?** **EarthID Enterprise**, operated and configured by the implementing organization. Your application validates the OIDC response and establishes its own app session.

**Who authorizes business actions?** **Your application/backend** is responsible for permission checks, local roles, active user status and record-level business rules. The organization can optionally govern application eligibility or defined groups/roles centrally through EarthID, **but only under a documented integration policy**; a successful EarthID login alone is never unrestricted business access.

**How does an existing local user ID work?** After secure one-time linking of **\`(issuer, sub)\` to \`local_user_id\`**, returning users sign in through EarthID without another local password. Their local account remains the source of their application permissions.

- **[Authentication vs Authorization — roles and responsibility matrix](guides/authentication-vs-authorization.md)**
- **[Developer FAQ — login twice? local user ID? token expiry? roles? MyDigital ID?](guides/FAQ.md)**
- **[Integration and security best practices — practical checks and UAT](guides/best-practices.md)**

## Choose your platform

| Platform | Integration guide | Example application |
| --- | --- | --- |
| **Next.js (App Router)** | [Next.js guide](nextjs/README.md) | [Next.js starter](nextjs/starter/) |
| **ASP.NET Core (Razor Pages)** | [ASP.NET guide](aspnet/README.md) | [ASP.NET Core starter](aspnet/starter/) |
| **PHP 8.3+** | [PHP guide](php/README.md) | [Plain PHP starter](php/starter/) · [Laravel reference](php/laravel/) |
| **Browser-only SPA (React, Vue, Angular, plain JS)** | [SPA public-client guide](spa/README.md) | [Vite + TypeScript starter](spa/starter/) |

## Integrating an existing application (no second login)

**Already have local user IDs, staff roles, permissions and business records?** EarthID Enterprise authenticates the user; **your application still owns its local accounts and authorization**. After a verified one-time association of `(issuer, sub)` with an existing `local_user_id`, returning users enter the application through EarthID **without another application password prompt**.

If an existing account has not been linked yet, require a **controlled one-time linking or administrator approval**. Never automatically link a privileged user just because an email or MyKad number appears to match.

- **[Step-by-step guide: preserve local users and add SSO](guides/existing-app-sso.md)** — first login, subsequent logins, account mapping, logout and session expiry.
- **[Case study: upgrading an existing licensing/permit application](case-studies/legacy-licensing-portal.md)** — realistic staff/applicant journeys, renewal, local roles, account linking and failure scenarios.
- **[Vendor integration and deployment readiness checklist](guides/vendor-readiness.md)** — questions to ask, operator-provided credentials, existing-user migration, UAT and handover.

See also the [developer integration journeys index](guides/README.md) to select the correct approach for your application.

## Identity verification without app sign-up or login

**[MyKad Verification via MyDigital ID](verification/mykad/README.md)** — a separate EarthID Enterprise capability for verifying an individual's MyKad identity during a one-time transaction **without creating an account or logging in to the client application**. The person completes a MyDigital ID challenge; EarthID redirects a signed `result_token` to your registered callback. Your application validates the result using EarthID's public JWKS, then applies its own business rules.

The organization implementing EarthID Enterprise provides the **MyKad Verification Client ID**, the correct service base URL, exact result-token issuer, JWKS URL, and approves your exact callback URI. The **v2.0 verification start request does not require a Client Secret or NRIC**. This verification flow is **not** OIDC SSO login and does not automatically establish a general login session.

- [Full API contract, sequence flow, JWT fields, errors, scenarios](verification/mykad/README.md)
- [Signed result verification example and offline tests](verification/mykad/examples/)
- [Verification UAT checklist](verification/mykad/UAT.md)

## Platform-specific SSO guides

Each platform guide provides onboarding steps, example code, login/session/logout concepts and verification requirements. The starter applications illustrate **OIDC Authorization Code Flow with PKCE**. Server-side samples use confidential clients; the browser-only SPA uses a **public client with NO Client Secret**. The examples are public reference implementations, not production-certified integrations.

## Before you start: obtain your credentials

**The organization implementing EarthID Enterprise provides your application's integration details.** Request the values appropriate to your application's registered client type from that organization's administrator:

| Required value | Who supplies it | Purpose |
| --- | --- | --- |
| **Issuer URL** | The organization implementing EarthID Enterprise | Identifies the correct OIDC service; used to obtain its discovery metadata |
| **Client ID** | The same organization | Identifies your registered application to EarthID Enterprise |
| **Client Secret** | The same organization, **only for a confidential server-side client**, through an approved private channel | Authenticates a server-side application; **NEVER used or supplied to a browser-only SPA** |

The organization must also **register and approve your application's exact callback/redirect URI**, applicable environments and requested scopes. For a **confidential server-side client**, both Client ID and Client Secret must match its registration. For a **public browser-only client**, the organization supplies only the Issuer URL and Client ID, enables Authorization Code + PKCE S256 and configures appropriate CORS on browser-accessed endpoints. **Do not put a Client Secret in frontend code.**

**Example organization host (illustration only):**

```text
https://earthid.organization-domain.com
```

This is a **placeholder hostname**, not a public EarthID Enterprise service or a guaranteed issuer. The real **Issuer URL** may include an additional path; use exactly what the implementing organization provides, and confirm it against the discovery document's `issuer` field. Do not guess your issuer, authorization, token or JWKS endpoints from the sample hostname.

### Example environment variables (confidential server-side clients only)

```dotenv
# Illustration only — replace ALL values with those provided by your organization.
EARTHID_ISSUER=https://earthid.organization-domain.com
EARTHID_CLIENT_ID=your-registered-client-id
EARTHID_CLIENT_SECRET=your-private-client-secret
```

Where a confidential client has a secret, store it in server-side environment variables or a secrets manager. **Never commit credentials to GitHub, expose them in a frontend bundle, or share them in screenshots or issue reports.**

## How EarthID Enterprise sign-in works

```text
User -> Your application -> Redirect to organization's EarthID Enterprise
     <- User signs in using the organization's configured authentication methods
     <- EarthID redirects an authorization code to your registered callback
Your application backend (or public SPA) -> Exchanges the code with PKCE and validates tokens
Your application -> Creates its own session and applies its own permissions
```

Your application should use the **(issuer, sub)** pair as an external identity key and independently enforce all business authorization. Additional claims, identity verification methods and organization-wide logout behavior depend on the implementing organization's configuration and approval.

## First-time developer checklist

1. Choose the platform guide above.
2. Request the **Issuer URL and Client ID** from the organization operating EarthID Enterprise. Request a **Client Secret only if using an approved confidential server-side client**; browser-only public clients have no secret.
3. Ask that organization to register the **exact callback URI** and approve minimal scopes such as `openid profile email` when appropriate.
4. Configure the starter using local, uncommitted environment settings.
5. Verify discovery and the exact issuer, then test sign-in with an authorized test account.
6. Confirm a signed-out user cannot access protected pages, and authenticated users cannot perform unauthorized business operations.
7. Test session expiry, errors and **local versus organization-wide SSO logout** before production.

## Security and support

Read [SECURITY.md](SECURITY.md) before contributing. This public repository must contain only generic product documentation, safe sample data and sanitized code. It must not contain real client credentials, user data, customer implementation details, internal infrastructure, non-public administrative endpoints or security incident information.

For client provisioning, issuer details, scopes, test accounts or logout capabilities, **contact the organization that implements and operates EarthID Enterprise**. Publishing this guide does not automatically grant access to an organization's deployment.

## Validation status

The starters include build/syntax checks in [GitHub Actions](.github/workflows/ci.yml). These do **not** replace live OIDC integration tests, application authorization review, or the implementing organization's UAT approval.

Last updated: 16 November 2026.
