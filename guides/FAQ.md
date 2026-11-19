# EarthID Enterprise Developer FAQ

Questions frequently raised by vendors integrating EarthID Enterprise into **existing systems**. Answers distinguish **authentication** (who signed in), **authorization** (what a user may do), and **account mapping** (which local user they are).

For the complete division of responsibilities, read **[Authentication vs Authorization](authentication-vs-authorization.md)** and the [best-practices checklist](best-practices.md).

## Getting started

### 1. What exactly is EarthID Enterprise?

EarthID Enterprise is an identity and access management / SSO platform. It allows an organization to authenticate people for connected applications through supported standards such as OpenID Connect (OIDC). The organization deploying it configures its identity providers, application clients and relevant access policy. Application integrations must use the actual endpoints and permissions that organization approves.

### 2. Is EarthID Enterprise only for testing?

No. The public developer guide describes an enterprise IAM product intended for real deployments. **This repository's example host and demo credentials are placeholders**, and its sample applications are not proof of any customer's production readiness. Obtain an approved client registration and run UAT against your organization's actual deployment.

### 3. Who provides the Issuer URL, Client ID and Client Secret?

The **organization implementing EarthID Enterprise**. The Issuer URL and Client ID identify your configured deployment and application. A **Client Secret is supplied privately only for a registered confidential (backend) client**. A browser-only SPA is a *public* client and **must not have a Client Secret**.

### 4. Can I use `https://earthid.organization-domain.com` directly?

No. That hostname is **fictional**. The real Issuer URL may contain an additional path. Your organization must provide the exact value, registered callbacks and approved scopes.

### 5. Does the user need an EarthID login and then a second login to my system?

**No for a properly linked existing user.** Your app validates the EarthID OIDC callback, resolves `(issuer, sub)` to its own `local_user_id`, checks local status and creates its app session. The user is signed in **without entering the application's password again**. The exception is a controlled **one-time linking step** for an unlinked existing account.

### 6. My system already has a `users` table. Must I delete it?

**No.** Keep local user IDs, roles, account state, licence/application records and your business authorization logic. Add a unique external-identity mapping for `(issuer, sub)`. EarthID is not a drop-in replacement for your application database.

### 7. Is the EarthID `sub` the same as my local user ID or MyKad?

**No assumption is valid.** In OIDC, `sub` is an opaque subject identifier scoped to the issuer. Store `issuer + sub` separately from your internal ID. Do not treat it as NRIC, email, a staff number or a universal person identifier.

### 8. How do I link a first-time EarthID user to an existing local user?

Require **proof of control of the existing account** or an **administrator-approved identity mapping**, and keep an audit record. Email/name/NRIC similarity alone is not safe enough to link a privileged account. Once linked, future logins should resolve automatically.

### 9. What if the user exists in EarthID but not in my application?

**Successful authentication is not local access approval.** Apply your onboarding policy: allow a low-privilege self-registration only if explicitly supported, require an invitation/approval, or deny and refer to an administrator. Never auto-provision a staff/admin role just because EarthID authenticated a user.

## Authentication vs authorization

### 10. Who should perform authentication?

**EarthID Enterprise** is the identity provider and authenticates the person under the implementing organization's policy. **Your application** is the relying party and must securely validate the OIDC response, create its local app session and enforce appropriate session lifecycle. These are complementary responsibilities.

### 11. Who should perform authorization?

**Your application's backend/API is the default owner of business authorization**: who can view, submit, edit, approve, renew or pay for a particular record, and whether the account is active. The organization can also centrally configure **app access eligibility or roles/groups in EarthID**, if expressly designed and approved. Your app must interpret and **enforce** any such policy signals; a successful login alone never grants business rights.

### 12. Can EarthID handle roles and access policies?

**Potentially, yes.** EarthID Enterprise includes identity governance and may provide centralized groups, roles and application access policies. **These are not automatically equivalent** to your system's `licence.approve`, `payment.refund` or record-level access. Centralized delegation requires a documented, trustworthy claim/policy contract and enforcement in the business application.

### 13. What if EarthID says authentication succeeded but the local user is disabled?

**Deny application access.** A valid EarthID identity does not override your local account's disabled/suspended status. Likewise, an authenticated staff member without the required permission must not access protected operations.

### 14. If a role changes in my application, do users have to re-register with EarthID?

**No.** Application role management is independent of external identity authentication unless there is an explicitly configured centralized-role model. Enforce changed permissions in app/API checks; invalidate or refresh cached privileges as your security policy requires.

### 15. My UI hides the Admin button. Is authorization complete?

**No.** Every protected API endpoint and record retrieval must independently enforce identity, role and record ownership/relationship checks. Frontend menus and route guards are usability controls, not security boundaries.

### 16. Does signing in once mean I can access all applications connected to EarthID?

**No.** SSO can **reuse authentication** across connected applications. **Each application or centrally configured access policy must separately approve access**. Different business permissions remain independent.

## Sessions, expiry and logout

### 17. Does an EarthID account or local user ID expire like MyDigital ID sessions?

Do not confuse an **account identifier** with a **session/token**. A local user ID and saved `issuer + sub` link are durable records until revoked or migrated. EarthID SSO browser sessions, authorization codes, ID/access tokens and local app sessions **have different lifetimes**. Ask the operator for the actual token and SSO timeouts; don't invent universal durations.

### 18. If my app session expires, must the user log in manually again?

Your app should start a new OIDC authorization flow. If the EarthID SSO session is still active and policy permits, authentication **may** complete without another password prompt. Otherwise EarthID prompts for authentication. The existing local user link should not need repeating.

### 19. When users click Logout, are they logged out of every EarthID application?

**Not necessarily.** App-local logout and EarthID-wide/SSO logout are **different** behaviors. RP-initiated logout, registered post-logout redirect and potentially front-/back-channel logout must be supported and tested with the organization. Never claim global logout based only on deleting one application's cookie.

### 20. How do I handle a bookmarked protected URL?

Save a **safe relative return path**, start EarthID login as required, validate callback and mapping, then redirect to the requested authorized route. Do not permit external return URLs, and don't use a user-supplied `returnTo` to create an open redirect.

## MyDigital ID and application scenarios

### 21. Must all users authenticate through MyDigital ID?

**No.** The available authentication methods depend on the organization's EarthID configuration and the registered client. Your application should not assume every user has MyDigital ID or every token contains MyKad attributes.

### 22. Can I verify a MyKad without forcing registration/login to my application?

**Yes, via the separate [MyKad Verification API](../verification/mykad/README.md)** when the organization has enabled that capability and registered your verification client. The person **still authenticates with MyDigital ID**. Your app receives a signed, short-lived **result token** for that transaction; this is **not** automatic SSO login or permanent authorization.

### 23. Does MyDigital ID verification prove that somebody owns a licence/property or may represent a company?

**No.** Verified identity means you have verified specified identity attributes. Ownership, representation, case access and payment/approval entitlements are **separate business checks** enforced against your application's authoritative records.

### 24. Can my old PHP or ASP.NET application integrate without a full rewrite?

**Often, yes**, if the system can support a maintained OIDC client/adapter, secure callbacks and local sessions. Unsupported runtimes and legacy components still require security review. See the [PHP](../php/README.md), [ASP.NET Core](../aspnet/README.md) and [existing-app](existing-app-sso.md) guides.

### 25. Can a frontend-only SPA integrate without a backend?

**Yes, as a registered OIDC public client** using Authorization Code + PKCE S256; no Client Secret. But any sensitive backend API **still** needs its own access-token validation and record-level authorization. See the [SPA guide](../spa/README.md).

### 26. Does the public repository tell me which hosting/server specifications to submit?

It provides a [vendor deployment-readiness template](vendor-readiness.md). Actual CPU/RAM/storage, hostnames, network zones, TLS arrangement, deployment approvals and production registration are determined by the receiving organization and your application's workload—not by copying a generic number from a demo.

### 27. Can I finish integration just by making the EarthID login button work?

**No.** You must prove successful callback validation, mapped and unmapped users, user status/permissions, denial of unauthorized records, safe return URLs, session expiry, logout behavior, secret handling and operational rollback.

## Linked EarthID Account in User Profile

### 28. Should an existing application show which EarthID account is linked?

**Yes, as a recommended best practice.** Add a **Linked EarthID Account** section under the application's existing **User Profile / Account Settings** page. Show **Linked / Not linked** status, provider name, a masked account hint if available, and the link date if the application recorded it. Do **not** expose a raw token, Client Secret or sensitive identity data. See the [profile and linking management guide](linked-account-profile.md).

### 29. Should users be able to Associate, Re-associate or Unlink an EarthID identity themselves?

**Only under a controlled security policy.** Associate requires proof that the person controls the **current local account** and a newly validated EarthID authentication result. Re-association requires additional safeguards: strong local account proof, authenticated new EarthID identity, uniqueness checks, confirmation, atomic replacement and audit. Unlink must be blocked when it would remove the user's only safe sign-in/recovery method, unless an approved assisted process exists. Privileged accounts may require administrative approval.

### 30. Does Re-associate change the user's local user ID, role or business records?

**No.** It changes which verified external **(issuer, sub)** maps to the same **local user ID**. App roles, existing business records and audit history remain managed by the application. A changed link must not silently grant extra privileges.

### 31. Can the application match and link by email alone?

**No.** Email is only a **display hint**, if granted by the IdP. It can be absent, changed or shared. The secure identity key is **(issuer, sub)** from a validated OIDC response, linked only after the user proves control of the local account or an administrator approves it.

### 32. If I unlink EarthID, am I logged out everywhere or is my local account deleted?

**Neither is automatic.** An unlink operation removes the **application's external identity mapping**. It does not delete the local account, its data or existing business audit records, and it is not global EarthID logout. Define app-session revocation explicitly. **Do not allow an EarthID-only user to self-unlink without an alternative approved sign-in/recovery path.**

## Starting a new application

### 33. Should I create username/password registration for a new EarthID-integrated app?

Usually **no**. When EarthID Enterprise is the sign-in provider, use OIDC and create a minimal local application user/profile **only when needed** for business records, audit or permissions. There is no need for another routine app password. See [New Application SSO-First Guide](new-application-sso.md).

### 34. Does first EarthID login automatically create a user?

No. **Your application chooses** its onboarding policy: approved public applicant JIT, staff invitation/preapproval, or no persistent profile. A valid EarthID identity never automatically gains staff/admin permissions.

### 35. Should a new app include Associate/Re-associate/Unlink buttons?

Not by default. If EarthID is the app's only sign-in provider, there is no legacy identity to link, and allowing Unlink could cause account lockout. Show the sign-in provider and local application role; add identity-management controls only with a proven recovery and approval policy.

### 36. Can a new frontend SPA authenticate without a backend?

Yes, as a registered **public client** using Authorization Code + PKCE with **no Client Secret**. It still needs appropriate backend/API authorization whenever private records or protected operations are involved.

### 37. Does EarthID automatically create the local business application account?

Ordinary OIDC authentication does not. **JIT provisioning is implemented by the application** after validating the response and checking its approved access policy, unless the organization has contracted a separate provisioning integration.

## Quick reference

| What you want | Use |
| --- | --- |
| Start a new EarthID-integrated application | [New Application SSO-First Guide](new-application-sso.md) |
| Let users view and manage their linked EarthID identity | [Linked EarthID Account profile UX](linked-account-profile.md) |
| Let an existing staff user sign in once and keep local roles | [Existing-app SSO](existing-app-sso.md) |
| Decide who authenticates and who authorizes | [AuthN vs AuthZ](authentication-vs-authorization.md) |
| Review recommended secure practices | [Best practices](best-practices.md) |
| Understand a licensing/renewal integration end-to-end | [Fictional licensing portal case study](../case-studies/legacy-licensing-portal.md) |
| Complete one-time MyKad verification without account creation | [MyKad verification guide](../verification/mykad/README.md) |
| Prepare for deployment and UAT | [Vendor readiness](vendor-readiness.md) |
