# EarthID Enterprise — Developer Integration Guide

Public integration documentation for software vendors building applications that authenticate users through **EarthID Enterprise** using OpenID Connect (OIDC).

EarthID Enterprise provides identity authentication and single sign-on. Your application redirects users to your organization's EarthID Enterprise service, handles the verified OIDC response, and remains responsible for application-specific permissions and business workflows.

## Choose your platform

| Platform | Integration guide | Example application |
| --- | --- | --- |
| **Next.js (App Router)** | [Next.js guide](nextjs/README.md) | [Next.js starter](nextjs/starter/) |
| **ASP.NET Core (Razor Pages)** | [ASP.NET guide](aspnet/README.md) | [ASP.NET Core starter](aspnet/starter/) |
| **PHP 8.3+** | [PHP guide](php/README.md) | [Plain PHP starter](php/starter/) · [Laravel reference](php/laravel/) |

Each platform guide provides onboarding steps, example code, login/session/logout concepts and verification requirements. The starter applications illustrate **OIDC Authorization Code Flow with PKCE**. The examples are public reference implementations, not production-certified integrations.

## Before you start: obtain your credentials

**The organization implementing EarthID Enterprise will provide the integration details for your application.** Request all three of these from that organization's EarthID Enterprise administrator:

| Required value | Who supplies it | Purpose |
| --- | --- | --- |
| **Issuer URL** | The organization implementing EarthID Enterprise | Identifies the correct OIDC service; used to obtain its discovery metadata |
| **Client ID** | The same organization | Identifies your registered application to EarthID Enterprise |
| **Client Secret** | The same organization, through an approved **private** channel | Authenticates your confidential, server-side application at the token endpoint |

The organization must also **register and approve your application's exact callback/redirect URI**, applicable environments and requested scopes. For a confidential web client, both Client ID and Client Secret must match the registration for the issuer you are using.

**Example organization host (illustration only):**

```text
https://earthid.organization-domain.com
```

This is a **placeholder hostname**, not a public EarthID Enterprise service or a guaranteed issuer. The real **Issuer URL** may include an additional path; use exactly what the implementing organization provides, and confirm it against the discovery document's `issuer` field. Do not guess your issuer, authorization, token or JWKS endpoints from the sample hostname.

### Example environment variables

```dotenv
# Illustration only — replace ALL values with those provided by your organization.
EARTHID_ISSUER=https://earthid.organization-domain.com
EARTHID_CLIENT_ID=your-registered-client-id
EARTHID_CLIENT_SECRET=your-private-client-secret
```

Store the real secret in server-side environment variables or a secrets manager. **Never commit credentials to GitHub, expose them in a frontend bundle, or share them in screenshots or issue reports.**

## How EarthID Enterprise sign-in works

```text
User -> Your application -> Redirect to organization's EarthID Enterprise
     <- User signs in using the organization's configured authentication methods
     <- EarthID redirects an authorization code to your registered callback
Your application backend -> Exchanges the code with PKCE and validates tokens
Your application -> Creates its own session and applies its own permissions
```

Your application should use the **(issuer, sub)** pair as an external identity key and independently enforce all business authorization. Additional claims, identity verification methods and organization-wide logout behavior depend on the implementing organization's configuration and approval.

## First-time developer checklist

1. Choose the platform guide above.
2. Request the **Issuer URL, Client ID and Client Secret** from the organization that operates your EarthID Enterprise deployment.
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
