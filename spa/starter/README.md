# EarthID Enterprise — runnable browser-only SPA

This is a plain TypeScript/Vite example of an **OIDC public client**. No application backend and **no Client Secret**.

## Configure

The organization implementing EarthID Enterprise must register a **public browser-based OAuth/OIDC client**, with PKCE S256 and no token endpoint client authentication. It provides your exact **Issuer URL** and **Client ID**, registers `http://localhost:5173/callback` for local testing, and enables CORS on browser-accessed OIDC endpoints.

```bash
cd spa/starter
cp .env.example .env.local
npm install
npm run dev
```

Use PowerShell `Copy-Item .env.example .env.local` on Windows. Edit your own `.env.local`, never commit actual credentials. Open `http://localhost:5173` and click **Sign in with EarthID**.

This app keeps the authenticated user and ID/access tokens **in memory only**. Refreshing returns to logged-out state. PKCE correlation state is briefly held in `sessionStorage` to survive the authorization redirect; it is not a login session.

The library manages code+PKCE/state/nonce. The example separately checks the signed ID token against the organization's published JWKS and the exact issuer/client audience.

**No live login is claimed:** the sample requires an approved public client, browser CORS and an authorized test user. The [parent guide](../README.md) covers lifecycle, logout and UAT.

## Production cautions

- Browser UI route guards do not secure backend APIs. All protected APIs independently validate access tokens and enforce business authorization.
- Use HTTPS and strict CSP; do not inject arbitrary scripts or render untrusted HTML.
- This sample uses **local logout only**; central SSO logout is separate.
- In-memory user state disappears on reload, deliberately.
- If your app needs long-running sessions, sensitive user records, or highly privileged actions, prefer a backend-for-frontend with secure HttpOnly cookies.
