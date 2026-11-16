# Laravel integration with EarthID Enterprise

**Who this is for:** vendors with an existing Laravel application who want to add EarthID Enterprise sign-in. This reference supports PHP 8.3+ and a Laravel application with standard web routes and session middleware.

The [standalone PHP starter](../starter/) is runnable without Laravel. **Do not paste its native-PHP session handling into Laravel**. Laravel has its own session, HTTP, caching and CSRF middleware.

## What this guide adopts from the EarthBiz architecture

An enterprise business application commonly needs three separate responsibilities:

1. **Identity provider (EarthID):** authenticates the user, returns an approved OIDC identity.
2. **Application identity mapping:** links the validated external **(issuer, sub)** to a local account. Any account creation/linking follows explicit policy.
3. **Business authorization:** decides what that local account can see or do; group or role values cannot be trusted without a documented grant and mapping.

This public example implements **(1)** and a small demo session for **(2)**. It deliberately does **not** implement business entity registration, identification documents, account claiming, automatic NRIC/email matching or other customer-specific workflows. A successful login must never automatically create an organization, licence, business relationship or privileged account.

## 1. Prerequisites and client onboarding

Install PHP 8.3+, Laravel with the \`web\` middleware, and the actively maintained \`firebase/php-jwt\` library:

\`\`\`bash
composer require firebase/php-jwt:^6.11
\`\`\`

Ask the EarthID deployment administrator to register your **confidential web client** with:

- Exact issuer URL, verified from discovery.
- Client ID and secret, supplied through a private channel.
- Exact callback URI, such as \`http://localhost:8000/earthid/callback\` for approved local development.
- Scope \`openid profile email\` (any extra scope requires justification and approval).
- Optional, exact post-logout URI for a **separately tested** global SSO logout flow.

Previously supplied DBKK documentation lists \`https://idp.dbkk.my/api/earthid\` as a **provisional** issuer. Confirm it is currently live, and that the discovery document's \`issuer\` is identical, before deploying.

## 2. Configure Laravel

In your existing Laravel application's **\`config/services.php\`**, add:

\`\`\`php
'earthid' => [
    'issuer' => env('EARTHID_ISSUER'),
    'client_id' => env('EARTHID_CLIENT_ID'),
    'client_secret' => env('EARTHID_CLIENT_SECRET'),
    'redirect_uri' => env('EARTHID_REDIRECT_URI'),
],
\`\`\`

In your **local** \`.env\`, enter privately supplied values:

\`\`\`dotenv
EARTHID_ISSUER=https://idp.dbkk.my/api/earthid
EARTHID_CLIENT_ID=your-approved-client-id
EARTHID_CLIENT_SECRET=your-private-client-secret
EARTHID_REDIRECT_URI=http://localhost:8000/earthid/callback
\`\`\`

Never commit real \`.env\` values or expose \`EARTHID_CLIENT_SECRET\` to JavaScript. The redirect URI must exactly match the registered value.

## 3. Add the OIDC controller and routes

Copy [\`EarthIdOidcController.php\`](EarthIdOidcController.php) into:

\`\`\`text
app/Http/Controllers/Auth/EarthIdOidcController.php
\`\`\`

Then merge [\`routes-example.php\`](routes-example.php) into your existing **\`routes/web.php\`**. Do not overwrite your existing routes.

The routes are:

| Route | Method | Purpose |
| --- | --- | --- |
| \`/earthid/login\` | GET | Redirect to the IdP with state, nonce and PKCE S256 |
| \`/earthid/callback\` | GET | Exchange code, validate signed ID token and create local Laravel session |
| \`/earthid/profile\` | GET | Require local authenticated session, show minimal claims |
| \`/earthid/logout\` | POST | Clear **local** Laravel session (CSRF-protected web route) |

Start Laravel:

\`\`\`bash
php artisan serve
\`\`\`

Open \`http://localhost:8000/earthid/login\`. To sign out locally, submit a form:

\`\`\`blade
<form method="POST" action="{{ url('/earthid/logout') }}">
    @csrf
    <button type="submit">Sign out of this application</button>
</form>
\`\`\`

The controller uses Laravel's HTTP client and \`firebase/php-jwt\`: provider discovery, strict issuer verification, state and nonce checks, PKCE S256, basic-authenticated token exchange, signed JWT verification from the published JWKS and audience validation. Claims are stored in a session **only after validation**.

## 4. Connect to your existing Laravel User model

**The provided controller is an integration reference, not a completed application-account implementation.** It creates a minimal session at \`earthid_identity\` and does not call \`Auth::login()\` or create a database record. In a production application, after validating the OIDC response:

- Resolve the local user by a **unique (issuer, sub)** mapping in your database.
- Only provision or link a new local account under your approved registration or identity-proofing policy. Never auto-link solely by matching email or NRIC.
- Verify that account is active, permitted in this application, and meets any organizational policies.
- Use Laravel \`Auth::login($user)\` and \`$request->session()->regenerate()\` when a local User is authorized.
- Enforce policies, gates and permissions **on each business endpoint**; OIDC authentication alone does not confer local privileges.

If your application has public, staff and admin entry points, the gate selected at login must be server-side state, and **authorization must be enforced after authentication**. Do not trust a user-provided \`gate=admin\` as proof of admin rights.

## 5. Important security and operational boundaries

- The example intentionally avoids plaintext JWT decoding as an authentication decision. **Decoding is not signature verification.**
- Do not implement a fallback that authenticates a test user in production when a client secret is absent.
- Do not log HTTP token response bodies, access tokens, ID tokens, refresh tokens or personal identity attributes.
- Use HTTPS outside local development. Prefer secure, HttpOnly, SameSite cookies, protected config/secrets, and stable session storage.
- Respect \`iss\` exact equality and \`aud\`/optional \`azp\`. JWT keys come from the issuer's discovery \`jwks_uri\`, with short cache duration and retry on key rotation.
- The sample supports **application-local** logout only. Central OIDC RP-initiated or back-channel logout requires an additional registered configuration, verified JWT handling and deployment-specific UAT.
- MyDigital ID and other verification claims are optional and not evidence of user authorization to perform a business action.

## 6. Acceptance criteria

Follow the [PHP UAT checklist](../UAT.md). Include rejection of invalid state, expired code, invalid signature or audience, unauthorized business actions, and stale or missing sessions. CI can lint this template but cannot validate a production EarthID deployment or local account mapping.

## Source and attribution

This guide's **architecture** was informed by review of the latest available EarthBiz-Gateway code as at 16 November 2026. That repository is private; no private paths, credentials, deployment settings or application-specific code are reproduced here. The implementation is deliberately rewritten for a security-focused public vendor guide. External library usage: [firebase/php-jwt](https://github.com/firebase/php-jwt).
