# Authentication vs Authorization — What EarthID Enterprise Does, and What Your App Must Do

**Read this before integrating SSO into an existing system.** Most implementation mistakes happen because developers confuse **identity authentication**, **local account mapping**, **application authorization**, and **identity verification**.

## 1. The short answer: who does what?

- **Authentication (AuthN):** The **organization's EarthID Enterprise deployment** authenticates the person, using the configured login methods. Your application is the OIDC relying party: it **must validate the authentication response** before treating anyone as signed in.
- **Local identity/account mapping:** **Your application** associates the verified external identity **(issuer, sub)** with its own **local user ID**, under an approved one-time linking/provisioning policy.
- **Authorization (AuthZ):** **Your business application** decides whether the local user can access a page, API, business record or action using its own roles, status and business rules.
- **Central access governance (optional):** The implementing **organization/EarthID administrator** can centrally manage application registrations, groups, roles, entitlement signals and coarse application access policy **where explicitly configured**. Your application must agree on the claim/policy contract and still enforce final business permissions. **Do not assume every EarthID deployment or OIDC token includes those attributes.**
- **One-time MyKad identity verification:** EarthID's separate verification service can return a signed verification result after MyDigital ID authentication. **That is not an automatic application login or authorization grant.**

### Definitions

| Term | Question it answers | Practical meaning |
| --- | --- | --- |
| **Authentication — AuthN** | **Who are you?** | EarthID confirms that the user authenticated through an approved identity method |
| **Identity mapping** | **Which account in my system is yours?** | App resolves validated \`issuer + sub\` to its existing \`local_user_id\` |
| **Authorization — AuthZ** | **What are you allowed to do?** | App checks its own roles, scopes (if applicable), policies, relationships, resource ownership and current account status |
| **Provisioning** | **Should a user account be created or linked?** | App/organization applies an agreed approval and registration policy; never inferred from a matching name/email |
| **Identity verification** | **Can this person prove specified attributes?** | A separate, transaction-scoped MyDigital ID verification challenge, when supported and approved |
| **SSO session** | **Can authentication be reused?** | EarthID browser session may avoid another password prompt; **does not grant access** to every connected application |
| **Local app session** | **Is this app session active?** | Your app establishes, protects, expires and revokes its own application session |

### A concrete example

A licensing officer is identified by EarthID as a valid person, but this **does not automatically** make them an authorized licence approver.

\`\`\`text
User clicks "Renew licence"
        │
        ▼
EarthID Enterprise authenticates the user (AuthN)
        │ verified issuer + subject
        ▼
Application resolves external identity → local_user_id=246
        │ local user is enabled?
        ▼
Application policy checks:
  - licence record belongs to this user / their authorized organization
  - user has permission "licence.renew"
  - current licence is eligible for renewal
        │
        ├─ all pass → allow operation and write application audit event
        └─ any fail → deny operation (even though EarthID login succeeded)
\`\`\`

## 2. Responsibility matrix

| Function | EarthID / organization operator | Vendor application | Important rule |
| --- | --- | --- | --- |
| Authentication method and login screen | **Primary** | Redirect to IdP | Don't recreate a second routine login form for mapped users |
| OIDC client registration, issuer, redirect and scopes | **Primary** | Supply app details; configure RP | Obtain real values from organization |
| Authorization Code + PKCE / OIDC response validation | Issues and signs tokens | **Must perform/validate** using a compliant library | Signature, issuer, audience, state, nonce, expiry |
| User directory / central account lifecycle | May manage enterprise users | May hold existing local accounts | Two accounts serve different purposes |
| Mapping \`issuer + sub\` to local \`user_id\` | May supply claims/approved directory mapping | **Owns application mapping** unless explicitly delegated | Controlled first-time linking |
| Central app allowlist / group eligibility | May manage and emit authoritative policy signals | **Check** any agreed signals | This is not enough for record-level business access |
| App user status, internal roles and permissions | Only if expressly delegated | **Default owner** | An active EarthID session cannot override a disabled local account |
| Business/resource permissions | Usually no knowledge of local records | **Final enforcement** | E.g., whose application, bill, licence, appointment |
| Session lifecycle | EarthID SSO session | Own app cookie/session | Different expiry and logout behaviors |
| Audit | Identity/authentication events | Business actions and account mapping changes | Avoid logging secrets/tokens/PII |
| MyDigital ID upstream authentication | Via approved integration | Receives appropriately approved claims or signed verification result | Identity proof ≠ business authority |

**Nuance:** EarthID Enterprise is an IAM platform and may include **access governance**, groups and policy features. The correct enterprise design can deliberately centralize certain *coarse-grained* access decisions. But OIDC sign-in **by itself** does not establish business entitlement, and an application must never assume a generic token grants the right to approve, delete, bill or edit a particular record.

## 3. What happens immediately after a successful EarthID login?

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant App as Vendor application
  participant E as EarthID Enterprise
  participant DB as Local user + business DB

  U->>App: Open protected URL
  App->>E: OIDC Authorization Code + PKCE
  U->>E: Authenticate or reuse existing SSO
  E-->>App: Authorization code
  App->>E: Exchange code; validate response
  App->>DB: Lookup mapping (issuer, sub)
  alt Linked and active
    DB-->>App: local_user_id and active status
    App->>App: Create local secure session
    App-->>U: Open app without second password
    U->>App: Perform protected business action
    App->>DB: Check local permissions and record access
    App-->>U: Allow or deny based on business rules
  else Unlinked
    App-->>U: Controlled one-time account linking / approval
  else Disabled or not authorized
    App-->>U: Access denied
  end
\`\`\`

A **local user ID is not a second login**. In a properly integrated system, the validated EarthID identity selects the existing local account and your app programmatically issues its own session, avoiding an extra password prompt.

## 4. Authentication success is not authorization success

These results must be intentionally different:

| Situation | Authenticated? | Authorized for the requested operation? | Correct outcome |
| --- | --- | --- | --- |
| User has valid EarthID identity; matching active app user with permission | Yes | Yes | Allow |
| User has valid EarthID identity; **local user disabled** | Yes | No | Deny |
| User has valid EarthID identity; **no mapped local user** | Yes | Not yet | Restricted linking/onboarding; don't grant business role |
| User has valid EarthID identity; tries to open another applicant's record | Yes | No | Deny record access |
| User has valid EarthID identity; supervisor role revoked | Yes | No for supervisor actions | Enforce current app policy |
| User has no valid app authentication/session | No | Not evaluated | Redirect to login or return 401 to API |
| Person completed separate MyKad identity verification | Verified for that transaction | Not implied | Continue only transaction explicitly permitted |

**HTTP convention:** a protected API often returns **401 Unauthorized** when no valid authentication credentials are present and **403 Forbidden** when authenticated credentials exist but permission is insufficient. Framework/session behavior can vary; avoid leaking sensitive existence information in either case.

## 5. What if EarthID can assign roles?

Define the **source of truth per permission**; don't merge unreviewed role names.

- **Organization-level groups or application eligibility:** may be issued/managed centrally **if configured and approved**.
- **Local actions, record ownership and lifecycle:** remain with the **business application** unless there is an explicitly designed policy decision/enforcement integration.
- **Never map a mere claim like \`department=Admin\` to an application-wide admin role.** Confirm token signature, issuer, audience, claim semantics, source of truth, approval, freshness, revocation and versioning first.
- **Do not assume a JWT \`roles\` array exists.** Claims depend on the deployment, client registration and scopes.
- A centrally delegated decision is **not self-enforcing**. The application/API must call or check the authoritative policy decision, validate context and enforce the result.

For a routine legacy application, the simplest and least disruptive default is:
**EarthID AuthN → local \`issuer + sub\` mapping → existing local AuthZ**.

## 6. Local sessions, OIDC tokens and expiry

Four concepts should not be conflated:

1. **EarthID SSO browser session:** determines whether the IdP can authenticate the user again without asking for credentials. Duration and logout depend on organization policy.
2. **Authorization code / ID token / access token:** short-lived protocol artifacts with distinct audiences/purposes. The **ID token describes the authenticated user** to the client. An **access token** is for an intended protected API/resource and must be checked by that API; do not interchange the two.
3. **Application session:** session cookie or protected server ticket managed by the vendor application. The app controls its timeout, revocation and account checks.
4. **Local user mapping:** a durable database association, not a session. Token expiry doesn't delete it.

**A second login should not appear merely because your app still has a local \`users\` table.** If an app session expires, it can initiate a fresh OIDC flow. An existing EarthID SSO session *may* make this seamless, subject to IdP and browser policy; otherwise the user authenticates again.

## 7. Where to put authorization checks

**Do this in your backend / protected API, not merely in the UI.** A disabled button or hidden menu is not authorization.

\`\`\`text
GET /api/licences/123
  1. Validate app session / API access token (correct issuer, audience, expiry).
  2. Resolve active local user ID.
  3. Verify "licence.read" permission for that user.
  4. Check record 123 belongs to the user or their authorized organization.
  5. Return only permitted data, otherwise deny.
\`\`\`

For browser-only SPAs, the resource server/API must enforce the actual access decision. A static SPA with no backend cannot itself protect sensitive server-owned records.

## 8. Minimum acceptance tests

- **Mapped user:** EarthID sign-in opens protected app without second password.
- **Unmapped user:** one-time secure linking, **not** email-/NRIC-only automatic linking.
- **Disabled user:** EarthID login succeeds, app denies.
- **Unauthorized role:** can view permitted page, cannot approve/reject business record.
- **Cross-user record:** changing URL or object ID does not expose another person's record.
- **Expired local session:** OIDC redirect and safe return to original deep link.
- **Central role changes:** interpreted only under agreed delegation policy.
- **Local role changes:** enforced by app even before EarthID identity changes.
- **Logout:** distinguish app-local session clearing from EarthID-wide SSO logout.
- **Identity verification:** one-time MyKad proof does not create staff role, app login or resource entitlement.

## 9. Related documentation

- [Frequently Asked Questions](FAQ.md)
- [Security and implementation best practices](best-practices.md)
- [Existing local users and account linking](existing-app-sso.md)
- [Fictional legacy licensing portal case study](../case-studies/legacy-licensing-portal.md)
- [MyKad verification without app login](../verification/mykad/README.md)

**Example host:** \`https://earthid.organization-domain.com\` is fictional. The organization implementing EarthID Enterprise provides the actual issuer and registration details.
