# EarthID Enterprise Integration — Security and Implementation Best Practices

**Audience:** vendor developers integrating new applications, older systems or APIs with an organization's EarthID Enterprise deployment.

**Core design principle:** **EarthID Enterprise authenticates the user. Your application maps that user to an internal account and enforces business authorization.** The implementing organization may additionally control central application eligibility, group policy and other delegated access controls **when explicitly configured**.

Start with [Authentication vs Authorization](authentication-vs-authorization.md) and the [FAQ](FAQ.md) if those responsibilities are unclear.

## 1. Decide who owns each access rule BEFORE coding

Document a **source-of-truth matrix** and agree it with the application owner and EarthID operator.

| Access decision | Recommended owner | Where checked |
| --- | --- | --- |
| Is this person authenticated? | EarthID under operator policy | App validates OIDC response; app maintains secure session |
| Is this client/application registered and allowed? | EarthID operator / central app registry | Registration/policy, plus app checks when needed |
| Is this a real local user, and is their account enabled? | **Application user registry** | App backend on session creation and sensitive actions |
| Is the person an officer, approver or applicant? | **Application user/role management by default**, or explicitly delegated role source | App authorization layer |
| May this user see licence #123? | **Business app record relationship/ownership** | Protected API/service |
| May this user approve a licence? | **Business app permission + workflow state** | Protected API/service |
| Is a MyKad identity verified for this one request? | MyDigital ID via approved EarthID verification | Validate signed verification result; associate with transaction |
| Can a verified person act for a company? | Business authority registry / explicit authorization evidence | Business app/backend |

**Never infer that successful OIDC login means access to all connected applications, records or roles.** SSO shares a sign-in experience; it does not share unrestricted business permissions.

## 2. Use the right protocol and client registration

| Application | Correct baseline | Do not do |
| --- | --- | --- |
| Server-rendered web app / backend-for-frontend | OIDC **Authorization Code + PKCE S256**, **confidential client**, Client Secret server-side | Expose Client Secret to browser |
| Browser-only SPA | OIDC Authorization Code + **PKCE S256**, **public client**, no Client Secret | Fake confidentiality by embedding a secret in JavaScript |
| API/resource server | Validate appropriate **access tokens** and authorization before returning data | Accept ID tokens as API bearer tokens |
| Public identity check without app account | Separate **MyKad Verification API**, signed transaction result | Mistake result token for SSO login or permission |

The operator must issue the correct registration and configure supported endpoints, callback(s), scopes and browser CORS where applicable.

### New application best practices

For **new** applications, avoid treating the legacy-account linking experience as mandatory:

- Use EarthID for routine sign-in; do not create unnecessary local passwords.
- Define **JIT applicant**, **invite-only staff**, and **accountless** policies as separate use cases.
- Create local business profiles only as needed and with least privilege; protect first-time creation with unique `(issuer, sub)` constraints.
- Never grant staff/admin roles solely because OIDC authentication succeeded.
- Don't offer unrestricted Unlink when EarthID is the app's only sign-in method.

Read [New Application Integration](new-application-sso.md) and [illustrative new portal case study](../case-studies/new-public-service-portal.md).

## 3. Validate every authentication response

- Verify OIDC `state`, `nonce`, exact `issuer` and `audience`, signed ID token, expiry, PKCE and redirect URI through a well-supported OIDC library.
- Use the organization's actual issuer from discovery; **do not guess endpoints** based on a hostname, or copy another client's issuer.
- Do not implement identity by base64-decoding a JWT and trusting the JSON; that is not signature verification.
- Reject missing/malformed claims; never substitute a default local administrator or “test user” on failure.
- Keep scopes minimal (`openid` and approved additional scopes only). Don't assume optional NRIC, phone, staff number, roles or MyDigital ID proof claims exist.

## 4. Map external users once, securely

- Resolve external identity using the pair **`(issuer, sub)`**, not email, NRIC, name, phone or the first matching row.
- Keep a unique constraint for the external identity; write linked/unlinked/relinked changes to a protected audit trail.
- If existing local user is **already linked and active**, issue a local app session automatically—**no extra password**.
- If **not linked**, perform one-time verified account control or administrator-approved mapping; deny privileged access until linking is approved.
- When multiple local accounts might match, stop and escalate rather than guessing.
- Never assign “admin,” “officer,” “approver” or another privileged role simply because OIDC authentication succeeded.
- Recheck disabled/revoked status when issuing an app session and whenever app policy or risk requires.

### Give users a visible linked-account profile

For an existing or legacy application, add a **Linked EarthID Account** area to **User Profile / Account Settings** with the current link status and a safe display hint (for example a masked linked email, if supplied). Consider protected **Associate**, **Re-associate** and **Unlink** actions.

**Security gate:** a self-service **Unlink** operation must not remove the user's **only** working sign-in method. Re-association requires strong proof of control of the local account and authentication of the new EarthID identity; do not delete the old link before the replacement succeeds. Privileged accounts may require administrator approval. Link status and available buttons must be calculated server-side, and every mutation must be authorized, CSRF-protected and audited.

See the full **[Linked EarthID Account User Profile UX and implementation guide](linked-account-profile.md)**, including a safe sample layout, state model, workflow diagrams, local API pattern and UAT.

## 5. Enforce authorization where the data lives

**All sensitive business access must be enforced by the backend or protected resource API.** Examples:

```text
POST /api/licences/123/approve
  - Is the application session or API token valid?
  - Which active local user is linked to this identity?
  - Does the user currently have "licence.approve"?
  - Is the licence in an approvable state?
  - Does the user have jurisdiction over this record?
  - Is separation of duties satisfied, if required?
  - If all pass: commit transaction and audit who approved
  - Otherwise: deny without changing data
```

**Do not** trust a frontend-only role check, hidden button, localStorage role value, a browser-supplied `local_user_id`, or unchecked role data from a token. Protect direct URL access, object-level IDs and API mutations. Apply least privilege and deny by default.

### If the organization wants centralized roles in EarthID

Central groups/application eligibility can be useful, **but only with an explicit contract**:

1. Which system owns each role, group and permission? Who approves membership and revocation?
2. Which claims or policy decision API conveys it? Is that information signed, audience-bound and current?
3. What is the mapping to **local business permissions**? Does the app allow a role only after its own checks?
4. What happens if the claim disappears, the user's local account is disabled, or the central policy service is unavailable?
5. How quickly must revocation propagate? What gets cached, and for how long?

**No approved contract -> do not auto-import identity claims as privileged business roles.**

## 6. Keep sessions and tokens separate

- EarthID's **SSO browser session** is not the application's **session cookie**.
- The **ID token** identifies the authenticated user to the OIDC client. An **access token** has its own intended API audience/scope.
- The application maintains its own session ID/cookie (HttpOnly, Secure over HTTPS, SameSite appropriate to the flow) or protected server-side ticket; regenerate session ID after login and enforce expiry.
- A saved external identity mapping and internal `local_user_id` normally **do not expire when access tokens expire**.
- Store Client Secrets in a server-side vault/secret manager, never in source code, JS bundles, screenshots or public issues.
- Avoid persisting bearer tokens in browser localStorage for sensitive apps; a backend-for-frontend with server-managed sessions is preferable when the app handles high-risk data.
- Recheck authorization for operations and apply session revocation/short-lived permissions where needed.

## 7. Do not promise seamless sign-in or global logout without testing

- A valid EarthID SSO session **may** allow a new app session without typing another password; browser cookie policy and IdP session state control this behavior.
- If the local session expires, redirect through a fresh OIDC flow and resolve the same local user. Do **not** repeat approved account linking.
- Preserve only **validated relative return paths**, not arbitrary external redirect destinations.
- App-local logout deletes the app session. Global EarthID logout requires separately supported/registered flow and deployment-specific testing.
- Keep secure local fallback administration **only** if formally approved, protected with strong authentication, limited to designated operators and audited.

## 8. Distinguish accountless MyKad verification from app sign-in

The [MyKad Verification API](../verification/mykad/README.md) can verify a person's identity for an isolated transaction **without an app account**. It is not an OIDC staff login.

- The person still completes an approved MyDigital ID authentication challenge.
- Validate the **signed `result_token`** (signature, issuer, audience, expiry, state, one-time `jti`, and `verified === true`).
- Treat the returned verified NRIC as **identity evidence**, not proof of property ownership, licence entitlement or company authority.
- Bind it to the intended transaction and expire any app-issued verified context.
- Never accept a client-submitted NRIC or an unvalidated result token as authorization.

## 9. Protect sensitive data and telemetry

- Minimize personally identifying fields. Redact NRIC, ID/access/refresh tokens, cookies, state values and secrets from logs and screenshots.
- Encrypt sensitive stores and backups under the organization's data governance rules.
- Audit external identity linking, privilege changes and important business actions against the **local user ID**, with appropriate protection for external identity references.
- Protect callbacks against open redirects, replay, CSRF and accidental token retention in URLs/logging.
- Use HTTPS, security headers, CSP as appropriate, and regularly patch dependencies.
- Never enable authentication mocks, bypass flags or permissive signature validation in production.

## 10. Integrate before deployment: minimum evidence

| ID | Test | Must pass |
| --- | --- | --- |
| BP-01 | Mapped existing user logs in via EarthID | Correct internal `user_id`, **no second password** |
| BP-02 | First-time unlinked user | Controlled link/invitation/admin approval; no automatic privileged access |
| BP-03 | Disabled local account | Valid EarthID login still results in **access denied** |
| BP-04 | User with insufficient role | Business API denies approval/mutation |
| BP-05 | User changes another person's record ID in URL/API | Record-level authorization denies access |
| BP-06 | Session or token expires | Safe reauthentication, no permanent bypass |
| BP-07 | Tampered token, wrong issuer, wrong audience, wrong state | Rejected |
| BP-08 | Local role removed | Updated access decision enforced |
| BP-09 | Logout | Local and central SSO behavior documented and separately tested |
| BP-10 | Deployment rollback | Changes can be reverted without corrupting local user mappings |
| BP-11 | Client registration | Correct issuer, client type, exact callback and secrets policy |
| BP-12 | Logs and browser bundle | No credentials, raw personal IDs or private tokens exposed |

**An SSO login button that opens EarthID is not successful integration until the application's local identities, permissions, negative-path tests and deployment handover are verified.**

## 11. Vendor delivery checklist

Before handing over a build to the receiving organization, supply **privately**:

- Framework/runtime, build artifact and deployment prerequisites.
- Exact callback URL and the client type required (confidential/public).
- Documented unique local user mapping and linking decision.
- Application role/permission matrix and business ownership rules.
- UAT report demonstrating linked, first-time, disabled and unauthorized users.
- Session and logout behavior, approved secrets handling, operational contacts, backup/rollback and support plan.

Don't publish customer deployment specifications, internal topology, secrets or user data in this public repository. See [vendor readiness and deployment handover](vendor-readiness.md).

## Related documentation

- [Authentication vs Authorization](authentication-vs-authorization.md)
- [Developer FAQ](FAQ.md)
- [Existing-application SSO and local-user linking](existing-app-sso.md)
- [Linked EarthID Account in User Profile](linked-account-profile.md)
- [Fictional legacy licensing portal case study](../case-studies/legacy-licensing-portal.md)
