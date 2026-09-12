/**
 * @jest-environment node
 */
jest.mock("jose", () => {
  function decodeJwt(token: string): Record<string, unknown> {
    const parts = token.split(".");
    if (parts.length < 2) throw new Error("Invalid JWT format");
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as Record<string, unknown>;
  }

  class SignJWT {
    private _payload: Record<string, unknown>;
    private _sub = "";
    private _exp = 0;

    constructor(payload: Record<string, unknown>) {
      this._payload = payload;
    }

    setProtectedHeader() { return this; }
    setSubject(sub: string) { this._sub = sub; return this; }
    setExpirationTime(exp: string | number) {
      if (typeof exp === "number") {
        this._exp = exp;
      } else if (exp === "1h") {
        this._exp = Math.floor(Date.now() / 1000) + 3_600;
      } else if (exp === "2h") {
        this._exp = Math.floor(Date.now() / 1000) + 7_200;
      } else if (exp === "30s") {
        this._exp = Math.floor(Date.now() / 1000) + 30;
      } else {
        this._exp = Math.floor(Date.now() / 1000) + 3_600;
      }
      return this;
    }

    setIssuer() { return this; }
    setAudience() { return this; }
    setJti() { return this; }
    setIssuedAt() { return this; }

    async sign(_secret: unknown) {
      const header = Buffer.from('{"alg":"HS256"}').toString("base64url");
      const fullPayload = { ...this._payload, sub: this._sub, exp: this._exp };
      const payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
      return `${header}.${payload}.mocksig`;
    }
  }

  return { decodeJwt, SignJWT };
});

import { SignJWT, decodeJwt } from "jose";
import {
  getBackendJwtFromStore,
  setBackendJwtInStore,
  invalidateBackendJwtSession,
  clearBackendJwtStoreForTesting,
} from "@/lib/auth-session";

async function makeBackendJwt(sessionId: string, userId: string, orgId: string | null, expiresIn = "1h") {
  return new SignJWT({ sessionId, orgId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode("unused-in-mock"));
}

function makeFastJwt(sessionId: string, exp: number): string {
  const header = Buffer.from('{"alg":"HS256"}').toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp, sessionId })).toString("base64url");
  return `${header}.${payload}.fakesig`;
}

const UID = "user-abc-123";
const SID_A = "session-aaa-111";
const SID_B = "session-bbb-222";
const ORG = "org-xyz-456";

beforeEach(() => {
  clearBackendJwtStoreForTesting();
});

describe("backendJwtStore session isolation", () => {
  test("two sessions for the same user+org have distinct cached JWTs", async () => {
    const jwtA = await makeBackendJwt(SID_A, UID, ORG);
    const jwtB = await makeBackendJwt(SID_B, UID, ORG);

    setBackendJwtInStore(`${UID}:${SID_A}:${ORG}`, jwtA);
    setBackendJwtInStore(`${UID}:${SID_B}:${ORG}`, jwtB);

    const fromStoreA = getBackendJwtFromStore(`${UID}:${SID_A}:${ORG}`);
    const fromStoreB = getBackendJwtFromStore(`${UID}:${SID_B}:${ORG}`);

    expect(fromStoreA).not.toBeNull();
    expect(fromStoreB).not.toBeNull();
    expect(fromStoreA).not.toBe(fromStoreB);

    const claimsA = decodeJwt(fromStoreA!);
    const claimsB = decodeJwt(fromStoreB!);

    expect(claimsA["sessionId"]).toBe(SID_A);
    expect(claimsB["sessionId"]).toBe(SID_B);
  });

  test("session B cannot retrieve session A token using session B cache key", async () => {
    const jwtA = await makeBackendJwt(SID_A, UID, ORG);
    setBackendJwtInStore(`${UID}:${SID_A}:${ORG}`, jwtA);

    const sessionBResult = getBackendJwtFromStore(`${UID}:${SID_B}:${ORG}`);
    expect(sessionBResult).toBeNull();
  });

  test("revoking session A leaves session B usable", async () => {
    const jwtA = await makeBackendJwt(SID_A, UID, ORG);
    const jwtB = await makeBackendJwt(SID_B, UID, ORG);

    setBackendJwtInStore(`${UID}:${SID_A}:${ORG}`, jwtA);
    setBackendJwtInStore(`${UID}:${SID_B}:${ORG}`, jwtB);

    invalidateBackendJwtSession(UID, SID_A, ORG);

    expect(getBackendJwtFromStore(`${UID}:${SID_A}:${ORG}`)).toBeNull();

    const surviving = getBackendJwtFromStore(`${UID}:${SID_B}:${ORG}`);
    expect(surviving).not.toBeNull();
    expect(surviving).toBe(jwtB);
    expect(decodeJwt(surviving!)["sessionId"]).toBe(SID_B);
  });

  test("new login after A logout does not reuse A revoked cached token", async () => {
    const jwtA = await makeBackendJwt(SID_A, UID, ORG);
    setBackendJwtInStore(`${UID}:${SID_A}:${ORG}`, jwtA);

    invalidateBackendJwtSession(UID, SID_A, ORG);

    const SID_NEW = "session-new-999";
    const jwtNew = await makeBackendJwt(SID_NEW, UID, ORG);
    setBackendJwtInStore(`${UID}:${SID_NEW}:${ORG}`, jwtNew);

    expect(getBackendJwtFromStore(`${UID}:${SID_A}:${ORG}`)).toBeNull();

    const retrieved = getBackendJwtFromStore(`${UID}:${SID_NEW}:${ORG}`);
    expect(retrieved).not.toBeNull();
    expect(decodeJwt(retrieved!)["sessionId"]).toBe(SID_NEW);
  });

  test("org A and org B tokens for one user+session stay isolated", async () => {
    const ORG_A = "org-aaa-111";
    const ORG_B = "org-bbb-222";

    const jwtOrgA = await makeBackendJwt(SID_A, UID, ORG_A);
    const jwtOrgB = await makeBackendJwt(SID_A, UID, ORG_B);

    setBackendJwtInStore(`${UID}:${SID_A}:${ORG_A}`, jwtOrgA);
    setBackendJwtInStore(`${UID}:${SID_A}:${ORG_B}`, jwtOrgB);

    const retrievedA = getBackendJwtFromStore(`${UID}:${SID_A}:${ORG_A}`);
    const retrievedB = getBackendJwtFromStore(`${UID}:${SID_A}:${ORG_B}`);

    expect(retrievedA).not.toBeNull();
    expect(retrievedB).not.toBeNull();
    expect(retrievedA).not.toBe(retrievedB);
    expect(decodeJwt(retrievedA!)["orgId"]).toBe(ORG_A);
    expect(decodeJwt(retrievedB!)["orgId"]).toBe(ORG_B);
  });

  test("expired entries are not returned on lookup", () => {
    const pastExp = Math.floor((Date.now() - 120_000) / 1000);
    const expiredJwt = makeFastJwt(SID_A, pastExp);

    setBackendJwtInStore(`${UID}:${SID_A}:${ORG}`, expiredJwt);

    expect(getBackendJwtFromStore(`${UID}:${SID_A}:${ORG}`)).toBeNull();
  });

  test("invalidateBackendJwtSession only removes the targeted session", async () => {
    const SID_C = "session-ccc-333";
    const jwtA = await makeBackendJwt(SID_A, UID, ORG);
    const jwtB = await makeBackendJwt(SID_B, UID, ORG);
    const jwtC = await makeBackendJwt(SID_C, UID, ORG);

    setBackendJwtInStore(`${UID}:${SID_A}:${ORG}`, jwtA);
    setBackendJwtInStore(`${UID}:${SID_B}:${ORG}`, jwtB);
    setBackendJwtInStore(`${UID}:${SID_C}:${ORG}`, jwtC);

    invalidateBackendJwtSession(UID, SID_B, ORG);

    expect(getBackendJwtFromStore(`${UID}:${SID_A}:${ORG}`)).toBe(jwtA);
    expect(getBackendJwtFromStore(`${UID}:${SID_B}:${ORG}`)).toBeNull();
    expect(getBackendJwtFromStore(`${UID}:${SID_C}:${ORG}`)).toBe(jwtC);
  });
});

describe("backendJwtStore size bound", () => {
  test("store evicts entries when capacity is exceeded", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7_200;
    const count = 5_001;

    for (let i = 0; i < count; i += 1) {
      setBackendJwtInStore(`bound-${i}:s:o`, makeFastJwt(`sid-${i}`, futureExp));
    }

    let found = 0;
    for (let i = 0; i < count; i += 1) {
      if (getBackendJwtFromStore(`bound-${i}:s:o`) !== null) found += 1;
    }

    expect(found).toBeLessThan(count);
    expect(found).toBeLessThanOrEqual(5_000);
  });

  test("expired entries are evicted first before LRU eviction runs", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7_200;
    const pastExpJwt = makeFastJwt("old", Math.floor((Date.now() - 120_000) / 1000));

    for (let i = 0; i < 4_999; i += 1) {
      setBackendJwtInStore(`evict-${i}:s:o`, makeFastJwt(`sid-${i}`, futureExp));
    }
    setBackendJwtInStore("evict-stale:s:o", pastExpJwt);

    const freshJwt = makeFastJwt("fresh", futureExp);
    setBackendJwtInStore("evict-fresh:s:o", freshJwt);

    expect(getBackendJwtFromStore("evict-fresh:s:o")).toBe(freshJwt);
  });
});
