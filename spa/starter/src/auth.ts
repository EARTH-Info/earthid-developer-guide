import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type User
} from "oidc-client-ts";
import { createRemoteJWKSet, jwtVerify } from "jose";

// The organization supplies these values. They are public, NOT secrets.
const issuer = import.meta.env.VITE_EARTHID_ISSUER?.trim().replace(/\/+$/, "");
const clientId = import.meta.env.VITE_EARTHID_CLIENT_ID?.trim();

function validateConfig(): { issuer: string; clientId: string } {
  if (!issuer?.startsWith("https://") || !clientId ||
      clientId.startsWith("replace-with-")) {
    throw new Error("Set the approved public-client Issuer URL and Client ID in .env.local.");
  }
  return { issuer, clientId };
}

export function safeLocalPath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") ||
      path.startsWith("//") || path.includes("\\")) return "/";
  try {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

let manager: UserManager | null = null;
let acceptedUser: User | null = null;

function getManager(): UserManager {
  if (manager) return manager;
  const config = validateConfig();
  manager = new UserManager({
    authority: config.issuer,
    client_id: config.clientId,
    redirect_uri: window.location.origin + "/callback",
    response_type: "code",
    scope: "openid profile email",
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    automaticSilentRenew: false,
    monitorSession: false,
    loadUserInfo: false
  });
  return manager;
}

async function validateSignedIdToken(user: User): Promise<void> {
  const config = validateConfig();
  if (!user.id_token) throw new Error("Missing OIDC ID token");

  const response = await fetch(
    config.issuer + "/.well-known/openid-configuration",
    { mode: "cors", cache: "no-store" }
  );
  if (!response.ok) throw new Error("OIDC discovery is unavailable");
  const metadata = await response.json() as {
    issuer?: string;
    jwks_uri?: string;
    id_token_signing_alg_values_supported?: string[];
  };

  if (metadata.issuer !== config.issuer) {
    throw new Error("Issuer mismatch in OIDC discovery");
  }
  if (!metadata.jwks_uri?.startsWith("https://")) {
    throw new Error("Missing secure JWKS endpoint");
  }
  if (!metadata.id_token_signing_alg_values_supported?.includes("RS256")) {
    throw new Error("This starter requires RS256 ID tokens");
  }

  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));
  const { payload } = await jwtVerify(user.id_token, jwks, {
    issuer: config.issuer,
    audience: config.clientId,
    algorithms: ["RS256"],
    clockTolerance: 30
  });

  if (!payload.sub || payload.sub !== user.profile.sub ||
      !payload.iat || !payload.exp ||
      (payload.azp !== undefined && payload.azp !== config.clientId)) {
    throw new Error("OIDC ID token claims did not validate");
  }

  // oidc-client-ts handles correlation state, nonce and PKCE transaction.
  // jwtVerify above establishes signature validity and issuer/audience claims.
}

export async function login(): Promise<void> {
  const returnTo = safeLocalPath(
    window.location.pathname + window.location.search + window.location.hash
  );
  await getManager().signinRedirect({ state: { returnTo } });
}

export async function handleCallback(): Promise<string> {
  try {
    const user = await getManager().signinRedirectCallback();
    await validateSignedIdToken(user);
    if (user.expired !== false) {
      throw new Error("OIDC access token is expired or missing expiry");
    }
    acceptedUser = user;
    const state = user.state as { returnTo?: unknown } | undefined;
    return safeLocalPath(state?.returnTo ?? "/");
  } catch (error) {
    acceptedUser = null;
    await getManager().removeUser();
    throw error;
  }
}

export function getAuthenticatedProfile(): {
  issuer: string;
  sub: string;
  name: string | null;
  email: string | null;
} | null {
  if (!acceptedUser || acceptedUser.expired !== false) {
    acceptedUser = null;
    return null;
  }
  const { issuer } = validateConfig();
  const p = acceptedUser.profile;
  return {
    issuer,
    sub: p.sub,
    name: typeof p.name === "string" ? p.name : null,
    email: typeof p.email === "string" ? p.email : null
  };
}

export async function localLogout(): Promise<void> {
  acceptedUser = null;
  await getManager().removeUser();
}
