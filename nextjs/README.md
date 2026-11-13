# Integrate EarthID Enterprise with Next.js

**Audience:** vendor developers who have never used EarthID Enterprise.

**Outcome:** run a Next.js application with EarthID sign-in, a protected server page and local sign-out using a registered OIDC confidential client.

- [Runnable starter project](starter/)
- [Manual integration/UAT checks](UAT.md)
- [Public repository security rules](../SECURITY.md)

## 1. What is EarthID?

EarthID Enterprise is an identity and SSO platform. **DBKK ID** is an organization-specific deployment. Your app remains responsible for permissions and business workflow.

```text
Browser           Next.js backend                 EarthID
  | Login button      |                              |
  |------------------>| /api/auth/signin/earthid    |
  |<------------------| redirect to authorization    |
  |------------------------------------------------->|
  |<---------------------------------------------- code
  |------------------>| /api/auth/callback/earthid  |
  |                    | exchange code + PKCE        |
  |                    | validate OIDC response <----|
  |<------------------| encrypted app session       |
  | Open /protected   | server verifies session     |
```

Your application must not collect or store EarthID user passwords. The starter uses **Authorization Code + PKCE S256**, state and nonce; token exchange occurs on the server. End users do not need to understand OIDC, but the vendor developer must.

## 2. Prerequisites

- Node.js **20.9+** (Node 22 LTS recommended) and npm.
- A Next.js-compatible development machine.
- An approved EarthID **confidential OIDC client** with a client ID and secret delivered privately.
- An authorized test user and the correct issuer confirmed by the deployment owner.

**No client registration = no login.** Do not use another vendor's client ID, secret, callback or test account.

## 3. Request onboarding before coding

Send the deployment administrator the following information (replace examples with your own):

| Field | Example / requirement |
| --- | --- |
| Organization / vendor | Example Vendor Sdn. Bhd. |
| Application | Example Licensing Portal |
| Environment | Development, staging or production |
| Client type | Confidential web application |
| Redirect URI | `http://localhost:3000/api/auth/callback/earthid` (local development, subject to approval) |
| Production callback | `https://your-app.example/api/auth/callback/earthid` |
| Allowed scopes | `openid profile email` (only what you need) |
| Post-logout redirect | Ask if central IdP logout is required, then register an approved exact URI |
| Contact | Technical owner / support email |

Every redirect URI **must be registered** by the deployment owner. The complete scheme, host, port, path and trailing slash must match. Avoid wildcards. Use HTTPS outside localhost.

The deployment may use additional approval, IP allowlisting, policies or identity verification. Those are not implied by the public guide.

## 4. Obtain the correct issuer

For the DBKK deployment, earlier integration material identifies this **temporary/provisional** issuer:

```text
https://idp.dbkk.my/api/earthid
```

Check its discovery URL:

```bash
curl -fsS https://idp.dbkk.my/api/earthid/.well-known/openid-configuration
```

The document's `issuer` property **must exactly match** the value given to your application administrator. This public guide is not evidence that the endpoint is currently online or that your client is enabled. Do not use a planned future domain until the deployment owner announces cutover.

Use discovery for `authorization_endpoint`, `token_endpoint`, `jwks_uri` and `end_session_endpoint`. Avoid manually composing them in client code.

## 5. Run the starter

From this repository:

```bash
cd nextjs/starter
cp .env.example .env.local
npm install
```

On Windows PowerShell, copy the file using `Copy-Item .env.example .env.local`.

Edit **only your local** `.env.local`:

```dotenv
EARTHID_ISSUER=https://idp.dbkk.my/api/earthid
EARTHID_CLIENT_ID=your-approved-client-id
EARTHID_CLIENT_SECRET=your-private-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-long-random-session-secret
```

Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32` (or an equivalent cryptographically secure secret generator). **Never commit `.env.local`.**

Then:

```bash
npm run dev
```

Open `http://localhost:3000` and click **Sign in with EarthID**. After successful authentication, the sample redirects to `/protected` and displays only the returned public-facing name, email (if granted) and stable `sub`. For production use, review authentication and data-protection requirements beyond the demo.

**Expected callback:** `http://localhost:3000/api/auth/callback/earthid`. If this URI is not registered exactly, login fails.

## 6. Understand the starter

| File | Purpose |
| --- | --- |
| `auth-options.ts` | OIDC provider discovery, state/nonce/PKCE, app session |
| `app/api/auth/[...nextauth]/route.ts` | Server-side callback and authentication endpoints |
| `components/auth-buttons.tsx` | Sign-in and **local** sign-out actions |
| `app/protected/page.tsx` | Server-side session verification |
| `types/next-auth.d.ts` | Exposes the stable external `sub` in the sample session |

The application creates an encrypted/HttpOnly NextAuth session cookie; it does **not** copy access, refresh or ID tokens into browser localStorage. A real system may need a shared session store, idle timeout policy, explicit authorization and separate account provisioning.

### Identity key and claims

Persist an external subject as `(issuer, sub)`. Never use email or NRIC as your stable user key. The same person can have different subject identifiers across issuer migrations. Claims like `staff_no`, `department` or `mydigital_verified` are **not guaranteed** to be issued to your app; request only justified scopes and never automatically turn a claim into a business role.

**MyDigital ID:** where offered, it is an authentication option through the deployment. Your app still talks OIDC to EarthID. Presence of a login button does not establish that your client has passed MyDigital ID UAT.

## 7. Local sign-out versus SSO sign-out

The starter's **Sign out from this app** button clears the NextAuth session cookie. This does **not** automatically terminate EarthID's SSO session. If the user signs in again, the deployment may authenticate them without prompting for credentials.

A **central EarthID logout** flow is a separate feature that requires testing with the deployment owner. It normally involves the discovered `end_session_endpoint`, an `id_token_hint` and a registered `post_logout_redirect_uri`, plus termination of the local session. Do not build logout by guessing redirect parameters, by copying an unrelated SPA's localStorage implementation, or by assuming a 200/204 HTTP response means every browser session ended.

For security-critical applications, agree on global logout and server-side back-channel session invalidation with the deployment owner before go-live.

## 8. Testing and troubleshooting

Follow [UAT.md](UAT.md) and record the actual results.

| Symptom | First checks |
| --- | --- |
| `invalid_redirect_uri` | Exact registered callback incl. scheme, port, slash |
| `invalid_client` | Client registered, correct ID/secret, right issuer and environment |
| `invalid_grant` | One-time code expired/reused; PKCE verifier or callback mismatch |
| `issuer mismatch` | Read live discovery and use exact `issuer` string |
| Login loop | Browser cookies, callback URL, reverse proxy headers, NEXTAUTH_URL |
| Signed out but immediate re-login | Local sign-out does not clear central EarthID session |
| Missing custom claim | Scope not approved, claim not granted, no claim mapping |

**Do not log** authorization codes, cookies, tokens, passwords or real personal identifiers. Use an HTTP status and request correlation ID for support.

## 9. Production acceptance

The starter is a **reference**, not a production certification. Before deploying: use HTTPS, secure secrets, unique client registration per environment, minimum scopes, authorization checks for every business API, CSRF controls, session expiration, security headers, an audit and monitoring plan, and negative-path tests. Check [UAT.md](UAT.md).

### Reference material

- [NextAuth.js custom OAuth providers](https://next-auth.js.org/configuration/providers/oauth)
- [NextAuth.js Route Handler integration](https://next-auth.js.org/configuration/initialization)
- [NextAuth.js deployment](https://next-auth.js.org/deployment)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
