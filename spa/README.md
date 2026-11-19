# EarthID Enterprise — Browser-only SPA integration

> **Building a new application?** Start with the [New Application SSO-First Guide](../guides/new-application-sso.md) to choose JIT applicants, preapproved staff, or an accountless approach. Your application still enforces business authorization.

> **Architecture first:** [Who handles Authentication vs Authorization?](../guides/authentication-vs-authorization.md) · [Best Practices](../guides/best-practices.md) · [Developer FAQ](../guides/FAQ.md). An EarthID login proves authentication; the application must still enforce local account and business permission checks.

Use this guide when your application is a **static website or single-page application** (React, Vue, Angular, or plain JavaScript) with **no server-side authentication backend**.

Start with the [runnable Vite + TypeScript starter](starter/). It uses OIDC Authorization Code Flow with **PKCE S256**, browser-based token exchange, and **no Client Secret**.

> **Already have a local user database?** EarthID authenticates; your application continues managing local user IDs, business roles and permissions. Read the [existing-system account linking guide](../guides/existing-app-sso.md) and [fictionalized legacy licensing case study](../case-studies/legacy-licensing-portal.md). Returning mapped users should **not** be asked for a second application login.

## 1. Understand public clients

| | Browser-only SPA | Server-side app / backend-for-frontend |
| --- | --- | --- |
| EarthID registration | **Public client** | Confidential client |
| Issuer URL | Organization supplies | Organization supplies |
| Client ID | Organization supplies | Organization supplies |
| Client Secret | **Never supplied to or used by the browser** | Organization supplies privately |
| Code + PKCE exchange | Browser → EarthID token endpoint | Backend → EarthID token endpoint |
| Token storage | Browser memory in this example | Server-controlled session |
| Suitable for | Low-risk browser UI or approved public-client access | Sensitive data, privileged apps, protected operations |

EarthID Enterprise remains the remote identity provider. “No backend” means **your SPA has no authentication server**: the browser contacts EarthID directly. The user still signs in at the organization's EarthID Enterprise service.

### Registration requirements

The organization implementing EarthID Enterprise must register your application specifically as a **public browser client**, not as a confidential server-side client. Request:

- **Issuer URL** and **Client ID**, both supplied by that organization.
- Exact callback URI, e.g. `http://localhost:5173/callback` for approved local development.
- Exact production callback, e.g. `https://app.organization-domain.com/callback`.
- Approved scopes, e.g. `openid profile email` where appropriate.
- Authorization Code Flow, **PKCE S256** and **token-endpoint authentication method `none`**.
- CORS for the approved SPA origin on browser-accessed **discovery, token and JWKS endpoints** (and UserInfo if used).

**Do not request a Client Secret for a browser-only SPA.** A secret in JavaScript, `VITE_...` variables or static hosting config becomes public when the app is built.

### Illustrative issuer — not a live service

```text
https://earthid.organization-domain.com
```

This is a fictional hostname, **not** a guaranteed Issuer URL. The real Issuer URL may include an additional path. Use exactly what the implementing organization provides, and verify it matches the discovery document's `issuer` field.

## 2. Browser-based authentication flow

```text
Browser SPA  ------ GET authorize (code + PKCE S256) ------> EarthID
Browser SPA  <----- 302 redirect ?code=...&state=... -------- EarthID
Browser SPA  ------ POST token (code + code_verifier) -----> EarthID
Browser SPA  <----- ID token + access token ---------------- EarthID
Browser SPA  ------ access protected resource with token --> API server
                                                       validates token and permissions
```

The browser app must not collect EarthID passwords. No `client_secret` is sent to the token endpoint.

## 3. Run the starter

Requires Node.js **20.19+** and npm:

```bash
cd spa/starter
cp .env.example .env.local
npm install
npm run dev
```

PowerShell: `Copy-Item .env.example .env.local`.

Edit `.env.local`:

```dotenv
# Organization-provided values; issuer shown is a placeholder.
VITE_EARTHID_ISSUER=https://earthid.organization-domain.com
VITE_EARTHID_CLIENT_ID=your-approved-public-client-id
```

Open `http://localhost:5173`. Click **Sign in with EarthID**. You must have a **registered public client**, matching callback, working CORS and authorized test user for live sign-in to succeed.

For a static deployment, `npm run build`, publish `dist/`, serve over HTTPS, and configure your host to return `index.html` for `/callback` and other SPA paths.

## 4. Session persistence — an explicit choice

This example keeps **ID/access tokens only in JavaScript memory**. The PKCE transaction (`state`, `nonce`, verifier) must survive a full-page redirect and is temporarily stored in browser **`sessionStorage`**. It is removed by the OIDC library after callback.

**A refresh clears this sample's login state.** EarthID's own SSO browser session may remain active, so a fresh top-level sign-in can complete without asking for a password. That is not the same as permanent application login.

Some real SPAs persist bearer tokens in `localStorage`; this offers more persistence, but any script running on the same origin can read those tokens, and refresh tokens are especially high-impact. Do not represent that approach as a security-neutral default. Use a backend-for-frontend with HttpOnly server-controlled sessions for stronger security and highly sensitive applications.

The example uses **`oidc-client-ts`** to manage authorization code, PKCE and callback state, plus **`jose`** to validate the **ID token signature and claims** from discovery/JWKS. Merely decoding JWT text is not authentication.

## 5. Logout and SSO behavior

**Sign out from this app** removes the local in-memory session. It does **not** prove that EarthID's central SSO cookie has been ended, and another app may remain logged in.

Organization-wide SSO logout is a different workflow. Ask the implementing organization whether the discovered `end_session_endpoint`, registered post-logout URI and `id_token_hint` are supported, and verify end-to-end behavior before claiming it works.

A static SPA cannot implement true **back-channel logout** by itself: that requires a server endpoint to validate signed logout tokens and invalidate server-side sessions. An unverified HTTP 204 acknowledgment does not constitute logout.

Avoid assuming that silent iframe login will work: browser third-party-cookie blocking, frame policies and identity-provider settings can prevent it. This example deliberately uses a **top-level redirect** as the reliable baseline.

## 6. Access control

A frontend route guard prevents casual UI access but **cannot secure an API**. A backend/resource server must validate any access token, its issuer, audience, expiry, scopes and the application's business permissions. **Never send an ID token as an API bearer token.**

Prefer the **(issuer, sub)** pair for external identity mapping; never assume that email, NRIC or organization-specific custom claims are universally available.

## 7. Test before production

Use the [SPA UAT checklist](UAT.md). A successful static build proves compilation, **not** a live EarthID client registration, CORS configuration or end-to-end authentication.

External references: [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html), [oidc-client-ts](https://github.com/authts/oidc-client-ts), [jose](https://github.com/panva/jose), [OAuth Security BCP (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700).
