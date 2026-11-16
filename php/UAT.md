# PHP EarthID integration — UAT checklist

Record date, environment, client ID (not the secret), tester and results in a **private** acceptance record. Never include raw tokens, NRIC, production user profiles or credentials in public GitHub issues.

| ID | Test | Expected result |
| --- | --- | --- |
| P-01 | New private browser visits protected page | Access denied / redirected |
| P-02 | Start login | Browser opens the deployment's OIDC authorization endpoint |
| P-03 | Approved test user logs in | Callback verifies state, PKCE and nonce, and establishes local session |
| P-04 | Tamper \`state\` or callback parameters | No new session; transaction rejected |
| P-05 | Expired/reused authorization code | Token exchange rejected |
| P-06 | Wrong client secret/redirect URI | Provider rejects request |
| P-07 | Wrong issuer or JWT signature/audience | No session created |
| P-08 | Read protected page | Only authenticated user sees own \`sub\` and approved profile claims |
| P-09 | Application logout | Local cookie/session invalidated; protected page blocked |
| P-10 | Sign in again after local logout | May reuse existing EarthID SSO session; behavior documented |
| P-11 | User without business permissions | All protected business actions denied |
| P-12 | Browser console and server logs | No tokens, client secrets, session cookies, PII leaks |
| P-13 | Security headers and cookies | HTTPS, HttpOnly, SameSite, Secure in non-local environment |
| P-14 | Claim availability | No assumption that \`nric\`, \`mydigital_verified\`, roles or phone are always present |

For centralized logout, separately validate the discovered \`end_session_endpoint\`, registered post-logout URI, cross-application behavior and validated back-channel logout JWT with the deployment administrator. The plain PHP starter **only** implements local application logout.

**A passing syntax check or Composer install is not an end-to-end EarthID UAT pass.**
