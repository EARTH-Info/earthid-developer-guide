# Node.js signed-result validation example

This example implements the **server-side trust decision** for the EarthID Enterprise MyKad Verification API v2.0.

It **does not** log anyone into an application and does **not** call the MyDigital ID service. The user completes verification in the EarthID-hosted browser challenge; this Node.js code validates the short-lived `result_token` your application receives afterwards.

## Install and run offline tests

```bash
cd verification/mykad/examples
npm install
npm test
```

Tests generate local RSA keys and short-lived JWTs. No client credentials or live service access is needed.

## Configuration: obtain these from the implementing organization

```dotenv
EARTHID_VERIFY_BASE_URL=https://earthid.organization-domain.com
EARTHID_VERIFY_RESULT_ISSUER=https://earthid.organization-domain.com/api/earthid
EARTHID_VERIFY_CLIENT_ID=example-verification-client
EARTHID_VERIFY_JWKS_URL=https://earthid.organization-domain.com/api/verify/mykad/jwks
EARTHID_VERIFY_REDIRECT_URI=https://app.organization-domain.com/verify/callback
```

**All values are fictional examples.** The actual issuer may differ from the example string. The client ID and callback are for a **MyKad Verification API client** and must be registered with the operating organization.

**Do not add a Client Secret to the v2.0 start URL**. An older version of the API documentation showed a different contract.

## Initiating a verification (browser redirect, not fetch JSON)

Your backend first creates a unique, unpredictable `state` (for example, `randomBytes(32).toString('hex')`) and stores it with the pending transaction and its expiration in an application-owned session or database.

Then construct the navigation URL on your backend:

```js
const params = new URLSearchParams({
  client_id: configuredClientId,
  redirect_uri: configuredCallbackUri,
  state: pendingVerificationState,
  mode: "popup"
});
const navigateTo =
  configuredEarthIdBaseUrl + "/api/verify/mykad/start?" + params;
```

Do **not** include `nric` or `client_secret` in new integration requests. This is a **GET navigation** endpoint: the browser follows redirects to MyDigital ID. In a popup integration, return this URL (or a same-origin launch route) and navigate the popup to it. A mobile-friendly alternative is a full-page redirect.

The client-owned callback receives:

```text
?result_token=<signed-jwt>&state=<same-state>
```

or:

```text
?error=verification_failed&error_description=...&state=<same-state>
```

Keep tokens out of access logs, analytics, referrer headers, and frontend storage; clear the query after consumption.

## Validate signed results on your backend

Example usage (framework-agnostic):

```js
import { createRemoteJWKSet } from "jose";
import { verifyMyKadResult } from "./verify-result.mjs";

const jwks = createRemoteJWKSet(new URL(
  process.env.EARTHID_VERIFY_JWKS_URL
));

// expectedState MUST come from a server-side pending transaction,
// never untrusted browser input alone.
const result = await verifyMyKadResult({
  resultToken: incomingResultToken,
  expectedState: pendingTransaction.state,
  expectedNric: pendingTransaction.expectedNric ?? null, // optional local match
  issuer: process.env.EARTHID_VERIFY_RESULT_ISSUER,
  clientId: process.env.EARTHID_VERIFY_CLIENT_ID,
  keySet: jwks,
  consumeJti: async ({ jti, expiresAt }) => {
    // Use a database UNIQUE constraint or Redis SET NX EX, atomically.
    // Return true ONLY if jti has never been used.
    return await yourSharedReplayStore.insertIfAbsent(jti, expiresAt);
  }
});

// ALSO atomically consume pendingTransaction.state in your database/session.
// Then optionally issue a short-lived, HttpOnly transaction-specific session.
console.log({ verified: result.verified }); // Don't log NRIC or full JWT.
```

The `consumeJti` callback is **mandatory**. For Redis, use an atomic command similar to:

```text
SET mykad:used-jti:<jti> 1 EX <remaining-validity-seconds> NX
```

Accept only an affirmative inserted result. Never use an in-memory `Set` for multi-instance production replay protection.

### Verified function return

```json
{
  "verified": true,
  "nric": "900101010000",
  "name": "Example Person",
  "comparisonPerformed": false
}
```

`matched` is added **only if the optional legacy claim exists**. Do **not** use `matched` as the v2.0 success criterion.

If the client application already has an expected NRIC, the example compares it to the verified `nric` **after** signature and claims validation and throws `nric_mismatch` when they differ.

## When integrating with Next.js / Laravel / ASP.NET

Your application must implement:
1. **Start endpoint:** generate/store pending state; launch a browser redirect.
2. **Callback endpoint:** receive result JWT; validate and consume state and `jti`; optionally establish an application-specific short-lived verified context.
3. **Business endpoint:** access the verified identity from your **server-controlled state**, not from a browser-submitted NRIC.
4. **Cleanup:** expire/revoke verified context and never persist raw tokens unnecessarily.

The result token isn't an OAuth access token; using `Authorization: Bearer <result_token>` to call unrelated APIs is not supported by this contract.

See the [full guide](../README.md) and [UAT checklist](../UAT.md).
