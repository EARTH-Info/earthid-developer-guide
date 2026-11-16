# MyKad Verification API — vendor UAT checklist

This checklist covers **accountless identity verification**, not SSO or application login. Test with an implementing organization's approved verification client and an authorized MyDigital ID test identity. Build/test checks alone are not provider UAT.

| ID | Action | Expected result |
| --- | --- | --- |
| MV-01 | Open application's public verification page | No registration or application login required |
| MV-02 | Request verification without an NRIC | EarthID start endpoint navigates to MyDigital ID challenge |
| MV-03 | Complete MyDigital ID authentication | Registered callback receives `result_token` and `state` |
| MV-04 | Validate signed JWT with provider JWKS | RS256 signature and `iss`, `aud`, `exp` validated |
| MV-05 | Check `verified` and `nric` | `verified === true`, `nric` is a compact 12-digit value |
| MV-06 | Optional `name` | Name used when supplied; absence handled |
| MV-07 | Wrong callback/redirect URI | Rejected by service (exact match) |
| MV-08 | Wrong state or expired pending transaction | Client rejects; no verified session |
| MV-09 | Expired token or manipulated JWT | Client rejects |
| MV-10 | Reuse same JWT or `jti` | Client rejects across processes/instances using shared atomic replay store |
| MV-11 | Expected NRIC differs from verified `nric` | Local comparison fails, without misreporting identity-provider failure |
| MV-12 | User cancels, closes popup or denies interaction | No verified session; retry/fallback offered |
| MV-13 | Browser blocks popups | Full-page redirect alternative is available |
| MV-14 | No authorization for a protected record | Server denies operation even when identity verification succeeded |
| MV-15 | Complete one approved workflow | Transaction succeeds using only app-local short-lived verification context |
| MV-16 | Session expires | Follow-up sensitive transaction requires fresh verification |
| MV-17 | Logging and redirect headers | No raw JWT, NRIC, identity data or secrets exposed in logs/referrers |
| MV-18 | Misconfiguration | No simulated result accepted in a production deployment |
| MV-19 | Legacy `nric` omitted | `matched` not required; `comparison_performed` normally false |

### Evidence

Record test date, client registration **identifier** (not any secret), configured issuer, callback URI, outcome, and redacted screenshots in a **private** UAT report. Do not upload any result tokens, real MyKad numbers or names to this public repository.

### Not tested by CI

GitHub Actions validates sample Node.js claim-verification logic using **locally generated test keys**, not the EarthID provider implementation, actual MyDigital ID infrastructure, real accountless business transactions, or the operator's client-registration rules. Only an approved end-to-end UAT can establish deployment readiness.
