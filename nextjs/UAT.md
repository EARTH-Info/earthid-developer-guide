# Next.js EarthID integration — manual UAT checklist

Complete **after your client ID and redirect URI are approved**. Enter a tested date, environment, tester and status. These checks have not been completed merely because this document exists.

| ID | Test | Expected result |
| --- | --- | --- |
| N-01 | Start with a new/private browser | Unauthenticated `/protected` redirects to home |
| N-02 | Sign in using approved test user | EarthID authenticates, Next.js callback completes, `/protected` opens |
| N-03 | Inspect session cookie | HttpOnly and Secure in HTTPS environments; no bearer token in localStorage |
| N-04 | Confirm authorized profile | Name/email shown only when granted; stable `sub` present |
| N-05 | Reject unrelated callback URI | IdP rejects unregistered URI |
| N-06 | State/PKCE tampering and replay | Authentication rejected; no session created |
| N-07 | Sign out of the **application** | Local session removed; protected route blocked |
| N-08 | Open a second tab after local sign-out | App session no longer grants protected access |
| N-09 | Sign in again with SSO still active | Behavior documented; no assumption of global logout |
| N-10 | Negative authorization check | Authenticated user without permission cannot invoke protected business API |
| N-11 | Lost/expired session | Clean re-authentication; no infinite redirect loop |
| N-12 | Secret/log inspection | No tokens or client secrets in console, URLs, screenshots or application logs |

## Evidence

Capture **redacted** test results only. Never upload raw tokens, screenshots containing NRIC, user data or client secret into a public issue or PR.

## Additional tests required before claiming global SSO logout

Confirm with the deployment operator the exact `end_session_endpoint` contract and post-logout allowlist, then verify that a browser fully signs out and a second relying-party session is invalidated as designed. Server-side back-channel notification must be JWT-validated, and applications using sessions must invalidate them.

## Important distinction

- `GET /api/auth/signout` and `POST /api/auth/signout` implement **app-local** logout in the starter.
- Neither a successful local sign-out nor a successful HTTP response from an IdP logout URL proves central SSO termination.
- MyDigital ID sign-in is **out of scope** unless the deployment supplies a test identity and explicit test criteria.
