# Public repository security policy

This repository is public and intended for third-party vendor developers.

## Allowed

- Publicly advertised OIDC issuer/discovery information, marked provisional when not currently verified.
- Public API/protocol contracts, safe architecture diagrams, generic code examples and fictitious client IDs.
- Application-side security controls and test checklists.

## Not allowed

- Real `client_secret` values, access/refresh/ID tokens, session cookies, passwords, signing keys, API keys, SSH keys.
- Internal hostnames/IPs, database topology, WAF/firewall policies, deployment scripts, operational credentials, admin URLs not intended for vendors.
- PII (including real NRIC), staff accounts, production screenshots, unredacted logs or audit events.
- Confidential penetration-testing findings, unpatched vulnerability details or internal incident timelines.

## Contribution checks

1. Use `.env.example` and local environment variables. Do not add a real `.env`.
2. Examine diffs for personal data, secrets, local file paths and non-public endpoints.
3. Pin or constrain dependencies to security-patched versions and run `npm audit` / `dotnet list package --vulnerable` when possible.
4. Test changes against a dedicated, authorized client. No public credentials are bundled.
5. Security questions and client onboarding must go through the deployment owner's approved private support channel.

**Deployment-specific claims are not promises.** In particular, MyDigital ID sign-in, custom scopes, claims, front-/back-channel logout and session propagation must be verified for each deployment/client before release.
