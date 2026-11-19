# Vendor onboarding, integration readiness and deployment handover

**Audience:** external developers building a new application or integrating an existing enterprise/agency application with EarthID Enterprise before deployment. This generic checklist is suitable for an application built locally, an older/legacy codebase, or a new cloud-hosted application.

**Scope:** EarthID SSO integration, new-app provisioning choices, and preservation of existing local user management where relevant. It is **not** an infrastructure sizing prescription, firewall approval, penetration test report or official deployment acceptance form. Obtain actual hosting requirements and the organization's own templates from the receiving operations team.

**Before coding:** agree who owns each permission and which system enforces it. Use the [AuthN vs AuthZ responsibility matrix](authentication-vs-authorization.md), [Best Practices](best-practices.md) and [FAQ](FAQ.md).

## 1. Identify the application's starting condition

Before requesting credentials, answer:

| Question | Example response |
| --- | --- |
| What framework/runtime is used? | Existing PHP site, ASP.NET, Laravel, Next.js or browser SPA |
| Does the app already have users? | Yes — local users with `user_id` |
| Who can access it? | Internal staff, supervisors, public applicants |
| Does it already implement permissions? | Yes — local roles and record-level checks |
| Does it have a backend? | Yes / No |
| What is its callback URL in staging/production? | Exact HTTPS URI (not a broad domain) |
| How will first-time external identities be linked? | Verified one-time link or admin-approved mapping |
| Is an emergency local admin path necessary? | Controlled, audited and protected if retained |
| What is the deadline or delivery gate? | UAT evidence, deployment checklist and approvals |

For a **new application**, read [new-app SSO and onboarding](new-application-sso.md) before implementing user creation. For an existing local account system, read [account linking and one-login guidance](existing-app-sso.md) before modifying authentication logic.

## 2. Information the EarthID operator must provide

Request the following from the organization implementing EarthID Enterprise:

| Required item | Notes |
| --- | --- |
| Exact OIDC **Issuer URL** | Use the issuer in the verified discovery metadata |
| **Client ID** | Registered for the correct application/environment |
| **Client Secret** | **Confidential server-side app only**, via a secure private channel |
| Client registration type | Confidential web application or approved public browser client |
| Exact registered redirect URI(s) | Per environment; HTTPS in production |
| Approved OIDC scopes/claims | Do not assume NRIC, staff number, department or MyDigital ID flags |
| SSO session and token policies | Actual lifetimes and reauthentication behavior from operator |
| Logout behavior | App-local vs RP-initiated/global logout; registered post-logout URI if supported |
| Allowed network/CORS requirements | Public SPA token exchange needs correct CORS; backend apps do not normally need browser-side token exchange |
| Technical onboarding contact | Person who manages client registration and test-account access |

**Illustrative host only:** `https://earthid.organization-domain.com`. The live issuer may include a path. A client registration is not created by reading this public repository.

## 3. What stays with the vendor

Prepare these items before integration:

- Local user database and a stable `local_user_id` key.
- Existing roles/permissions, disabled-user status, record-level access checks.
- Unique mapping for **`(issuer, sub)` -> local_user_id**.
- One-time linking, unlinking and migration/recovery process.
- App's own secure session cookie, timeout, session-revocation and logout design.
- Application audit events: login success/failure, local user mapping actions, significant business changes.
- Deployment configuration through secure secrets/environment channels.
- A recovery plan so failure of one identity flow does not accidentally open protected business access.

**SSO should replace the user's routine application password prompt, not the application's business authorization.**

## 4. Recommended delivery phases

| Phase | Deliverable | Exit criteria |
| --- | --- | --- |
| **A. Assessment** | Runtime/architecture, local identity and roles inventory | Clear integration approach; no implicit user migration |
| **B. Onboarding** | EarthID client registration and exact redirects | Test client approved; issuer/discovery checked |
| **C. Integration** | Login, callback, unique subject mapping, local session | Mapped user reaches protected page without second login |
| **D. User migration** | One-time linking / controlled provisioning path | Re-login resolves same local user; duplicate identity blocked |
| **E. UAT/security** | Failure paths, access control, logout, session expiry, audit | Results documented; high-severity findings fixed |
| **F. Deployment handover** | Release artifact, environment settings, backup/rollback, runbook | Receiving operations team approves deployment readiness |

Avoid deploying an incomplete authentication flow merely because the UI login button works. **Missing local-user mapping and permissions checks are functional blockers, not cosmetic enhancements.**

## 5. Deployment readiness handover template

Use this table to request or hand over the actual hosting information. **Do not invent VM size, CPU, memory, private IP, ports or security policy.** Those are determined by the application workload and the hosting organization.

| Category | Vendor should supply | Owner confirms |
| --- | --- | --- |
| Release and runtime | Framework/runtime and versions; build/deployment artifact; dependencies | Receiving team |
| Application URL | Fully qualified HTTPS hostname, reverse proxy/TLS arrangement | DNS/operations team |
| Network | Source/destination flows for outbound OIDC discovery, authorization navigation and token exchange | Network/security |
| EarthID registration | Issuer, client ID, approved redirect and optional logout URI (secret via vault only) | EarthID operator |
| Secrets | Secure storage mechanism, rotation contact, access policy | Operations/security |
| Database | Schema/migrations, mapping table, account backup/recovery strategy | Application owner/DBA |
| Sessions | Cookie settings, data-protection keys if applicable, timeout, shared sessions if multi-instance | App team |
| Authorization | RBAC/ABAC policy table, disabled-user behavior, admin route protection | Application owner |
| Logging and monitoring | Sanitized authentication failures, health check, security events, alert owners | App/operations |
| Rollback | Known-good release, database migration reversal plan, contact/decision authority | Change owner |
| Testing | Staging callback proof, linked/unlinked/disabled user UAT, logout and fallback behavior | UAT owner |
| Operational ownership | Support contact, post-deployment handover and incident escalation | Implementing organization |

**Public repository rule:** Do not attach internal infrastructure diagrams, nonpublic server sizing forms, actual private network routes, credentials or client-specific security findings to this repository. Share deployment-specific information with the receiving team through their approved private channel.

## 6. UAT evidence: minimum meaningful demonstration

The vendor should be able to record and demonstrate:

1. **Previously linked user:** Start from a deep link; authenticate through EarthID; arrive in the existing app, using its own local `user_id`, **without a second login**.
2. **First-time user:** No local mapping; show controlled one-time linking and a successful **second** visit without repeating the link.
3. **Disabled user:** EarthID authentication succeeds but app denies access.
4. **Unauthorized action:** User cannot access another user's record merely by changing an ID/URL.
5. **Session expired:** App redirects and reestablishes its session only after a valid EarthID flow.
6. **Logout:** App-local logout works; central logout (if supported) is separately verified rather than assumed.
7. **Failure/rollback:** Invalid issuer, unavailable identity provider, changed callbacks and deleted mapping fail securely.

Keep screenshares and UAT recordings free of secrets, raw JWTs and personal information.

## 7. Quick developer FAQ

**Q: After successful EarthID login, do users need to sign in to my system again?**  
**A:** No for mapped users. Your backend resolves `(issuer, sub)` to its local user and creates its session. A one-time linking step may be required for previously unmapped users.

**Q: Does EarthID replace my user table?**  
**A:** No. Keep local user IDs, roles, business data and application-level authorization unless a separately planned migration changes that architecture.

**Q: Is my local user ID the same as EarthID's `sub`?**  
**A:** No. Treat `sub` as an opaque external identifier. Store the relationship in a unique mapping table.

**Q: Must I use MyDigital ID?**  
**A:** Not necessarily. Authentication methods and released claims depend on the implementing organization's EarthID configuration. Your OIDC client should not assume any particular upstream identity provider.

**Q: Does the EarthID ID expire?**  
**A:** An application user ID and its saved mapping are not login sessions. IdP cookies, OIDC tokens and local sessions **do expire** based on separately configured policies. Ask the operator for actual limits.

**Q: May I keep a local admin account?**  
**A:** Only under an explicit, secured, auditable fallback policy. Do not add a universal authentication bypass.

**Q: My app is on an old framework. Must I rewrite it?**  
**A:** Not solely because of SSO. You need a standards-compliant OIDC flow and secure local session handling; some old stacks may require a supported broker/adapter. Review maintenance and security support before choosing an approach.

**Q: Is MyKad Verification the same as SSO?**  
**A:** No. It verifies identity for a particular transaction, potentially without a local user account. For a staff dashboard that depends on local accounts/roles, use OIDC SSO and a local mapping.

**Q: Can I deploy once the OIDC login screen works?**  
**A:** No. Mapped/first-time/disabled users, permissions, session expiry, logs, secrets and rollback must also pass UAT.

See the [legacy portal case study](../case-studies/legacy-licensing-portal.md) for an end-to-end example.
