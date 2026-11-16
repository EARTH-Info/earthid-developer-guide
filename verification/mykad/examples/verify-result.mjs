import { jwtVerify } from "jose";

const NRIC_PATTERN = /^[0-9]{12}$/;

/**
 * Validate a signed MyKad verification result JWT.
 *
 * IMPORTANT:
 * - expectedState must come from a server-side pending transaction.
 * - keySet must use the signing JWKS URL approved by the EarthID operator.
 * - consumeJti must be an ATOMIC, SHARED, one-time replay check.
 * - this is NOT an OIDC access token or an app login session.
 */
export async function verifyMyKadResult({
  resultToken,
  expectedState,
  expectedNric = null,
  issuer,
  clientId,
  keySet,
  consumeJti,
}) {
  if (typeof resultToken !== "string" || !resultToken ||
      typeof expectedState !== "string" || expectedState.length < 16 ||
      typeof issuer !== "string" || !issuer.startsWith("https://") ||
      typeof clientId !== "string" || !clientId ||
      !keySet || typeof consumeJti !== "function") {
    throw new Error("invalid_verification_configuration");
  }

  // Explicit RS256 pinning, JOSE signature validation, exact iss/aud,
  // expiration, not-before (if present) and clock skew.
  const { payload } = await jwtVerify(resultToken, keySet, {
    issuer,
    audience: clientId,
    algorithms: ["RS256"],
    clockTolerance: 30,
  });

  if (!Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= payload.iat) {
    throw new Error("invalid_token_lifetime");
  }

  if (typeof payload.state !== "string" ||
      payload.state !== expectedState) {
    throw new Error("state_mismatch");
  }

  if (payload.verified !== true) {
    throw new Error("verification_not_successful");
  }

  if (typeof payload.nric !== "string" ||
      !NRIC_PATTERN.test(payload.nric)) {
    throw new Error("invalid_verified_nric");
  }

  if (expectedNric !== null) {
    if (typeof expectedNric !== "string") {
      throw new Error("invalid_expected_nric");
    }
    const normalized = expectedNric.replace(/-/g, "");
    if (!NRIC_PATTERN.test(normalized)) {
      throw new Error("invalid_expected_nric");
    }
    if (normalized !== payload.nric) {
      throw new Error("nric_mismatch");
    }
  }

  if (typeof payload.jti !== "string" || !payload.jti) {
    throw new Error("missing_token_identifier");
  }

  // Atomic and durable: e.g., Redis SET key 1 EX remainingSeconds NX,
  // or a DB insert guarded by a unique index. Fail closed on store errors.
  const consumed = await consumeJti({
    jti: payload.jti,
    expiresAt: payload.exp,
  });
  if (consumed !== true) {
    throw new Error("token_replay_detected");
  }

  const result = {
    verified: true,
    nric: payload.nric,
    name: typeof payload.name === "string" ? payload.name : "",
    comparisonPerformed: payload.comparison_performed === true,
  };
  if (typeof payload.matched === "boolean") {
    result.matched = payload.matched;
  }
  return result;
}
