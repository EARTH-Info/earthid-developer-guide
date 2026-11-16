import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { verifyMyKadResult } from "./verify-result.mjs";

const issuer = "https://earthid.organization-domain.com/api/earthid";
const clientId = "example-verification-client";
const state = "4b40d2f8dbe34a7f8ac0960c12baba68";
const nric = "900101010000";

async function fixture() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const used = new Set();

  const makeToken = async (overrides = {}) => {
    const claims = {
      verified: true,
      nric,
      name: "Example Person",
      state,
      comparison_performed: false,
      ...overrides,
    };
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer)
      .setAudience(clientId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .setJti(crypto.randomUUID())
      .sign(privateKey);
    return token;
  };

  const opts = {
    expectedState: state,
    issuer,
    clientId,
    keySet: publicKey,
    consumeJti: async ({ jti }) => {
      if (used.has(jti)) return false;
      used.add(jti);
      return true;
    },
  };
  return { makeToken, opts };
}

test("accepts valid signed verification and returns compact NRIC", async () => {
  const { makeToken, opts } = await fixture();
  const result = await verifyMyKadResult({
    ...opts,
    resultToken: await makeToken(),
    expectedNric: "900101-01-0000",
  });
  assert.deepEqual(result, {
    verified: true,
    nric,
    name: "Example Person",
    comparisonPerformed: false,
  });
});

test("rejects token replay", async () => {
  const { makeToken, opts } = await fixture();
  const token = await makeToken();
  await verifyMyKadResult({ ...opts, resultToken: token });
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: token }),
    /token_replay_detected/
  );
});

test("rejects wrong state", async () => {
  const { makeToken, opts } = await fixture();
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: await makeToken(), expectedState: "different-state-1234567890" }),
    /state_mismatch/
  );
});

test("rejects missing successful verification", async () => {
  const { makeToken, opts } = await fixture();
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: await makeToken({ verified: false }) }),
    /verification_not_successful/
  );
});

test("rejects different verified NRIC when a local comparison is required", async () => {
  const { makeToken, opts } = await fixture();
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: await makeToken(), expectedNric: "990101010000" }),
    /nric_mismatch/
  );
});

test("rejects wrong token issuer or audience", async () => {
  const { makeToken, opts } = await fixture();
  const token = await makeToken();
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: token, issuer: "https://different.organization-domain.com" }),
  );
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: token, clientId: "some-other-client" }),
  );
});

test("rejects invalid signature", async () => {
  const { makeToken, opts } = await fixture();
  const { publicKey: wrongPublicKey } = await generateKeyPair("RS256");
  await assert.rejects(
    async () => verifyMyKadResult({ ...opts, resultToken: await makeToken(), keySet: wrongPublicKey }),
  );
});

test("accepts optional legacy matched claim without requiring it", async () => {
  const { makeToken, opts } = await fixture();
  const value = await verifyMyKadResult({
    ...opts,
    resultToken: await makeToken({ comparison_performed: true, matched: true }),
  });
  assert.equal(value.matched, true);
  assert.equal(value.comparisonPerformed, true);
});
