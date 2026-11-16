# Runnable plain PHP EarthID starter

This sample uses **PHP 8.3+** and the established [jumbojett/openid-connect-php](https://github.com/jumbojett/OpenID-Connect-PHP) library (OIDC discovery, code flow, state, nonce, PKCE S256, ID token verification). It keeps the confidential client secret and token exchange on the server.

## Prerequisites

- PHP >= 8.3 with cURL, JSON and OpenSSL extensions, Composer.
- Client registration approved at the selected EarthID deployment.
- The following **exact** local callback registered by the administrator: \`http://localhost:8080/callback\`.
- An authorized test account. No live user credentials are included.

## Install and run

\`\`\`bash
cd php/starter
composer install
cp .env.example .env
\`\`\`

Windows PowerShell: \`Copy-Item .env.example .env\`.

Edit \`.env\` with the **approved** issuer, client ID, secret and callback URI. Then:

\`\`\`bash
php -S localhost:8080 router.php
\`\`\`

Open \`http://localhost:8080\`, click **Sign in with EarthID**, then open **Protected page**. The callback route is \`/callback\`; it must match the registered redirect exactly.

**Do not commit \`.env\`**. The built-in PHP server is for local development, not production. Use HTTPS and a secure web server and session backend for deployed applications.

## What is verified?

The OIDC library obtains provider metadata from discovery and validates ID token signatures and protocol claims. The sample sets PKCE S256 explicitly, requires the exact token issuer, a matching client audience and the correct authorized-party claim when present. It regenerates its application session identifier on successful login. No token is printed or persisted in browser storage. For a production system, add session lifecycle controls, upstream JWKS rotation testing, request auditing and per-route business authorization.

## Files

| File | Purpose |
| --- | --- |
| \`composer.json\` | OIDC library and dotenv dependencies |
| \`.env.example\` | Safe local configuration template |
| \`router.php\` | Routes requests for \`php -S\` |
| \`public/index.php\` | Login, callback, protected page, CSRF-protected **local** logout |
| \`tests/smoke.php\` | Offline dependency-load smoke check |

## Sign-out is local

POST \`/logout\` destroys the application's PHP session and HttpOnly session cookie. This **does not** end the EarthID SSO session at the identity provider. Central RP-initiated logout (if required) must be agreed with the operator, configured using the discovered \`end_session_endpoint\`, the correct \`id_token_hint\`, a registered redirect and independently verified with browser tests.

## Errors

| Symptom | Check |
| --- | --- |
| Missing configuration | \`.env\` and \`phpdotenv\` values |
| Provider rejects redirect | Exact \`/callback\`, origin, port and scheme are registered |
| Invalid client | Correct deployment, client ID/secret (never paste into a public issue) |
| State/nonce verification fails | Browser cookie retained during login, no competing login in same session |
| Issuer/audience mismatch | Exact discovery issuer and registered client ID |
| Library/discovery error | PHP cURL/TLS enabled; issuer accessible from the PHP host |

**No live UAT has been claimed.** Your application's permissions, session controls and organizational logout requirements remain your responsibility.
