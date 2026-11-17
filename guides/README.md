# EarthID Enterprise — Integration journeys and implementation decisions

Framework starters answer **how to initiate OIDC login**. These guides explain **how to integrate identity into a real application** that already has users, roles, legacy authentication and a deployment process.

## Essential concepts before writing code

- **[Linked EarthID Account profile UX](linked-account-profile.md)** — let users see and safely manage the link to their local account.
- **[Authentication vs Authorization](authentication-vs-authorization.md)** — who verifies identity, who manages application accounts, and who decides business permissions.
- **[Best Practices](best-practices.md)** — secure OIDC callback, local user linking, RBAC, API checks, session expiry and UAT.
- **[Frequently Asked Questions](FAQ.md)** — direct answers to common vendor integration questions, including first login and subsequent login.

## Start with your situation

| Your situation | Read |
| --- | --- |
| I want to know who handles authentication vs authorization | [AuthN / AuthZ responsibility matrix](authentication-vs-authorization.md) |
| I'm unsure whether users must log in twice or whether their user ID expires | [Developer FAQ](FAQ.md) |
| I want secure production implementation guidance | [Integration best practices](best-practices.md) |
| My existing application should show which EarthID identity is linked in User Profile | [Linked Account profile, Associate, Re-associate and Unlink](linked-account-profile.md) |
| My existing application already has its own users, passwords and roles | [Keep your local user system and integrate SSO](existing-app-sso.md) |
| I'm adapting an existing permit/licensing service and want to understand a real user journey | [Fictionalized legacy licensing portal case study](../case-studies/legacy-licensing-portal.md) |
| I must submit deployment/readiness information or plan UAT | [Vendor onboarding, deployment and UAT handover](vendor-readiness.md) |
| I want one-time MyKad identity verification **without creating an account** | [MyKad Verification via MyDigital ID](../verification/mykad/README.md) |
| My app is browser-only, with no authentication backend | [Public-client SPA integration](../spa/README.md) |
| I want runnable framework code | [Next.js](../nextjs/README.md), [ASP.NET Core](../aspnet/README.md), [PHP / Laravel](../php/README.md) |

## The three responsibilities

```text
EarthID Enterprise          Your application                Your business rules
AUTHENTICATION              LOCAL IDENTITY MAPPING         AUTHORIZATION
Who signed in?      ──────► Which local user is it? ────► What can they do?
issuer + sub                 application_user_id             roles/policies/status
```

**A local user account is not a second login.** Once a verified EarthID identity is linked to a local account, subsequent successful EarthID sign-ins can resolve the same local user automatically. The application still creates and enforces its own security session, user status and permissions.

## Two different product journeys

- **SSO:** sign into an application. The local application may require a linked user account for role-based operations.
- **MyKad verification:** obtain an independent, signed identity-verification result for a particular transaction. It does not by itself sign the person into your application or establish a permanent account.

Examples are intentionally fictional and use `https://earthid.organization-domain.com` as an **illustrative hostname only**. The organization operating EarthID Enterprise supplies the real issuer, client credentials (a secret only for confidential clients), client registration and redirect URLs.

Do not publish real customer infrastructure, credentials, internal workflows or business data in this public repository.
