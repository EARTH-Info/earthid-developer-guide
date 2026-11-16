# EarthID Enterprise browser-only SPA — UAT checklist

Run these with an **approved public client** and authorized test identity. Do not publish token values, actual user information or credentials.

| ID | Check | Expected result |
| --- | --- | --- |
| SPA-01 | Browser bundle | No Client Secret, refresh token or actual credentials |
| SPA-02 | New browser opens `/protected` | Displays sign-in prompt |
| SPA-03 | Start sign-in | Top-level redirect; `response_type=code` and PKCE S256 |
| SPA-04 | Complete sign-in | Callback state and PKCE validated; ID token signature, issuer, audience verified |
| SPA-05 | After callback | Authorization code removed from address bar |
| SPA-06 | Wrong state, replayed code, wrong issuer or audience | Authentication rejected |
| SPA-07 | Browser network inspection | Token request contains `client_id` + `code_verifier`, **not Client Secret** |
| SPA-08 | CORS | Discovery, token and JWKS available to approved origin |
| SPA-09 | Browser token storage | No bearer/ID/refresh token persisted in localStorage or sessionStorage |
| SPA-10 | Refresh after sign-in | App reverts to logged-out state (intentional, in-memory only) |
| SPA-11 | Click local logout | Local user removed; protected UI no longer available |
| SPA-12 | Cross-origin / malformed return path | No open redirect |
| SPA-13 | Third-party cookies disabled | Top-level interactive sign-in still available |
| SPA-14 | API request without valid access token | API/resource server rejects request independently |
| SPA-15 | Production host | HTTPS, CSP, security headers and SPA callback path rewrites configured |

A local build and a green CI job are not proof of successful integration with an organization's EarthID Enterprise deployment. Get operator UAT approval before release.
