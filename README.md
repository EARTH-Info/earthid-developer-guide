# EarthID Enterprise — Developer Integration Guides

Public, vendor-facing integration documentation for applications that authenticate users through **EarthID Enterprise** using OpenID Connect (OIDC).

EarthID Enterprise is an identity and single sign-on platform supplied by EARTH Info. A deployment such as **DBKK ID** or **JTU SSO** is an organization-specific configuration of the platform. Your application integrates with the deployment's **issuer**, not with EARTH Info's internal infrastructure.

## Choose your framework

| Framework | Start here | Example |
| --- | --- | --- |
| **Next.js (App Router)** | [Next.js integration guide](nextjs/README.md) | [Next.js starter](nextjs/starter/) |
| **ASP.NET Core (Razor Pages)** | [ASP.NET integration guide](aspnet/README.md) | [ASP.NET Core starter](aspnet/starter/) |

Both starters demonstrate the **OIDC Authorization Code Flow with PKCE** and use application-controlled sessions. The Next.js example distinguishes local logout from organization-wide SSO logout. Never treat a successful login as proof that your application's authorization rules are correct.

## How it works

```text
User → Vendor app → Redirect to EarthID authorization endpoint
                    ← Authentication at EarthID (method depends on deployment)
     ← Authorization code sent to registered callback
Vendor backend → Exchanges code and validates tokens
Vendor app → Creates local session and applies app-specific permissions
```

An application's onboarding **requires approval** by the relevant deployment administrator. Publishing this guide does **not** grant access to any EarthID deployment, user directory, production client, or MyDigital ID integration.

## Current public configuration example: DBKK ID

The previously supplied DBKK integration document identifies the following **provisional** issuer:

```text
https://idp.dbkk.my/api/earthid
```

Discovery URL derived from it:

```text
https://idp.dbkk.my/api/earthid/.well-known/openid-configuration
```

**Important:** Endpoint reachability and the issuer value must be confirmed by the deployment administrator during client onboarding. These values can change. Obtain the **exact** issuer from discovery; do not hardcode authorization/token/JWKS paths. Do not configure an announced future domain before it is formally enabled.

## First-time developer checklist

1. Select the [Next.js](nextjs/README.md) or [ASP.NET](aspnet/README.md) guide.
2. Request a client registration for the **specific deployment** you will use; provide the application name, exact callback URL, post-logout URL (if required), environment and minimal scopes.
3. Receive your client ID and (for a confidential client) secret **through an approved private channel**.
4. Configure environment variables locally; never commit actual secrets or tokens.
5. Verify that OIDC discovery's `issuer` matches the issuer configured in the application **exactly**.
6. Run the starter, sign in with an authorized test account, and check that a protected route is denied when unauthenticated.
7. Validate login errors, logout semantics, cookie security and permissions before production release.

## Identity versus application authorization

- EarthID authenticates the person and returns identity claims granted to the client.
- Your **application** decides what that person may view, edit, submit or approve.
- Use the **(issuer, sub)** pair as the stable external identity key; do not key solely on email, name, NRIC or a role claim. The `sub` alone can collide across issuers.
- MyDigital ID availability, additional scopes or custom claims are **deployment- and client-specific**, not automatically available because a UI displays a sign-in option.

## Public documentation policy

Read [SECURITY.md](SECURITY.md) before contributing. Only publish protocol guidance, public endpoints, fictitious example data and sanitized starter code. Do not publish real credentials, private architecture, internal IPs, firewall rules, customer data, security findings, account identifiers, or screenshots containing personal information.

## Project status and provenance

- **Next.js:** App Router starter using NextAuth.js 4.24.15 (security-patched stable 4.x) and server-side OIDC callback.
- **ASP.NET:** Updated to .NET 10 LTS and adapted from the existing [EARTH-Info/earthid-aspnet-guide](https://github.com/EARTH-Info/earthid-aspnet-guide); simplified for public distribution and no longer prints tokens.
- **End-to-end authentication depends on having an approved client and test account.** The code is an example, not a claim that integration/UAT against DBKK production has succeeded.

Documentation date: 13 November 2026.
