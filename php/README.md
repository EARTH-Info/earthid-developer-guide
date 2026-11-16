# EarthID Enterprise — PHP developer guide

**Target:** external vendors integrating a PHP application with an EarthID Enterprise deployment (for example, DBKK ID). This guide assumes no previous knowledge of EarthID.

## Choose your PHP application type

| Type | Guide | Deliverable |
| --- | --- | --- |
| **Plain PHP 8.3+** | [Getting started](starter/README.md) | Complete, minimal Composer project: login, callback, protected page and local logout |
| **Laravel (PHP 8.3+)** | [Laravel guide](laravel/README.md) | Laravel OIDC controller/configuration templates and security guidance for existing Laravel apps |

The Laravel guide follows the **architectural use case** of an existing business application: EarthID authenticates a person; the business application owns user profiles and business permissions. The guide is rewritten independently for public use; it does **not** publish private application code or operational details.

## What are EarthID Enterprise and DBKK ID?

EarthID Enterprise is an Identity and Access Management / Single Sign-On (SSO) platform. DBKK ID is an organization-specific deployment of EarthID Enterprise. In the OIDC flow:

\`\`\`text
User selects "Sign in with EarthID" in your PHP app
    -> browser is redirected to EarthID's authorization endpoint
    -> EarthID authenticates the user (method depends on deployment)
    -> EarthID returns a one-time authorization code to your registered callback
    -> your PHP backend exchanges it for tokens with PKCE S256
    -> a reputable OIDC library validates ID token signature + claims
    -> your app creates its own session and checks business permissions
\`\`\`

**EarthID authenticates identities; it does not decide which application records the person may access.** Neither login nor a role-looking claim automatically creates a company, a business account, a licence or representative authority.

## What you need before running either example

1. PHP 8.3+ (and required extensions), Composer and an HTTP server with sessions.
2. An approved **confidential OIDC client** on the target deployment and an authorized test user.
3. Client ID and client secret supplied **privately** by the deployment administrator.
4. Exact redirect URI(s) registered against that client; no guessing or wildcards.
5. The issuer confirmed against its live **OpenID Connect discovery document**.

Previously supplied DBKK integration material identifies the **provisional** issuer:

\`\`\`text
https://idp.dbkk.my/api/earthid
\`\`\`

The derived discovery URL is:

\`\`\`text
https://idp.dbkk.my/api/earthid/.well-known/openid-configuration
\`\`\`

The public example is **not** proof that the endpoint is currently reachable or that your client has been approved. Confirm it with the deployment owner and use the exact issuer returned by discovery. Do not hardcode token, authorization or JWKS endpoints, and do not switch to an unannounced domain.

### Client registration template

| Item | Sample |
| --- | --- |
| Application name | Example Vendor Portal |
| Environment | Development / Staging / Production |
| Client type | Confidential server-side web app |
| Client ID | Issued by deployment admin |
| Redirect URI (plain PHP) | \`http://localhost:8080/callback\` |
| Redirect URI (Laravel) | \`http://localhost:8000/earthid/callback\` |
| Requested scopes | \`openid profile email\` (minimum needed) |
| Post-logout redirect | Request only if you require centralized SSO logout |
| Technical contact | Vendor support address |

Local HTTP callback is for **development only** and only when explicitly registered. Use HTTPS for anything externally exposed.

## Security essentials

- **Authorization Code Flow + PKCE S256**, random single-use \`state\` and \`nonce\` for each login.
- Validate ID token **signature** with discovery JWKS, and verify \`iss\`, \`aud\`, \`exp\`, \`nonce\` and \`azp\` as appropriate. Merely decoding a JWT payload **is not validation**.
- Keep client secrets and token exchanges on the server. Never put tokens in HTML, URLs, localStorage, git commits or logs.
- Keep a protected, HttpOnly, SameSite cookie session and regenerate the session ID on authentication.
- Key a local identity by **(issuer, sub)**, not NRIC or email alone; do not auto-link existing users on an unverified email match.
- Scopes/claims (including MyDigital ID verification or extra identity fields) are **deployment-specific** and require approval.
- Local application logout **does not guarantee** global EarthID SSO logout. Negotiate and test RP-initiated and back-channel logout separately.

Use the [UAT checklist](UAT.md) before onboarding a production app.

## Framework-specific guides

- [Plain PHP / Composer starter](starter/README.md)
- [Laravel integration reference](laravel/README.md)
- [Developer UAT checklist](UAT.md)
- [Public repository security policy](../SECURITY.md)

**Not certified:** These examples are reference implementations. End-to-end EarthID login and deployment-specific logout remain unverified until the vendor tests with an approved client and receives UAT acceptance.
