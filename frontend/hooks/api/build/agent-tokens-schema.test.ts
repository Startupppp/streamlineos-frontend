import { agentTokenListContract, agentTokenCreateContract } from "./agent-tokens-schema";

const validListItem = {
  id: 42,
  name: "CI Deploy Token",
  tokenPrefix: "sk-abc",
  scopes: ["build:read", "build:write"],
  lastUsedAt: "2024-06-01T00:00:00.000Z",
  expiresAt: "2025-01-01T00:00:00.000Z",
  revokedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const validCreateResponse = {
  token: "sk-abc123fulltoken",
  id: 42,
  name: "CI Deploy Token",
  tokenPrefix: "sk-abc",
  scopes: ["build:read"],
  expiresAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("agentTokenListContract (BLD-X-BE-SETTINGS-TOKENS-001)", () => {
  it("accepts a valid token list", () => {
    expect(agentTokenListContract.safeParse([validListItem]).success).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(agentTokenListContract.safeParse([]).success).toBe(true);
  });

  it("rejects a non-array", () => {
    expect(agentTokenListContract.safeParse(validListItem).success).toBe(false);
  });

  it("accepts lastUsedAt as null", () => {
    expect(
      agentTokenListContract.safeParse([{ ...validListItem, lastUsedAt: null }]).success
    ).toBe(true);
  });

  it("accepts expiresAt as null", () => {
    expect(
      agentTokenListContract.safeParse([{ ...validListItem, expiresAt: null }]).success
    ).toBe(true);
  });

  it("accepts revokedAt as null", () => {
    expect(
      agentTokenListContract.safeParse([{ ...validListItem, revokedAt: null }]).success
    ).toBe(true);
  });

  it("accepts revokedAt as a date string", () => {
    expect(
      agentTokenListContract.safeParse([{ ...validListItem, revokedAt: "2024-07-01T00:00:00.000Z" }]).success
    ).toBe(true);
  });

  it("rejects non-array scopes — array field must not accept a plain string", () => {
    expect(
      agentTokenListContract.safeParse([{ ...validListItem, scopes: "build:read" }]).success
    ).toBe(false);
  });

  it("accepts empty scopes array", () => {
    expect(
      agentTokenListContract.safeParse([{ ...validListItem, scopes: [] }]).success
    ).toBe(true);
  });

  it("rejects an item missing createdAt", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validListItem;
    expect(agentTokenListContract.safeParse([withoutCreatedAt]).success).toBe(false);
  });

  it("rejects an item missing name", () => {
    const { name: _name, ...withoutName } = validListItem;
    expect(agentTokenListContract.safeParse([withoutName]).success).toBe(false);
  });
});

describe("agentTokenCreateContract (BLD-X-BE-SETTINGS-TOKENS-002)", () => {
  it("accepts a valid create response with full token", () => {
    expect(agentTokenCreateContract.safeParse(validCreateResponse).success).toBe(true);
  });

  it("rejects a response missing the token field — token is only returned on creation", () => {
    const { token: _token, ...withoutToken } = validCreateResponse;
    expect(agentTokenCreateContract.safeParse(withoutToken).success).toBe(false);
  });

  it("accepts expiresAt as null in create response", () => {
    expect(
      agentTokenCreateContract.safeParse({ ...validCreateResponse, expiresAt: null }).success
    ).toBe(true);
  });

  it("accepts expiresAt as a date string in create response", () => {
    expect(
      agentTokenCreateContract.safeParse({ ...validCreateResponse, expiresAt: "2025-12-31T00:00:00.000Z" }).success
    ).toBe(true);
  });

  it("rejects non-array scopes in create response", () => {
    expect(
      agentTokenCreateContract.safeParse({ ...validCreateResponse, scopes: "build:write" }).success
    ).toBe(false);
  });

  it("accepts empty scopes in create response", () => {
    expect(
      agentTokenCreateContract.safeParse({ ...validCreateResponse, scopes: [] }).success
    ).toBe(true);
  });

  it("rejects a response missing id", () => {
    const { id: _id, ...withoutId } = validCreateResponse;
    expect(agentTokenCreateContract.safeParse(withoutId).success).toBe(false);
  });

  it("rejects a response missing createdAt", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validCreateResponse;
    expect(agentTokenCreateContract.safeParse(withoutCreatedAt).success).toBe(false);
  });
});

describe("agent-tokens cache key contract (BLD-X-BE-SETTINGS-AT-003)", () => {
  it("agent tokens key is organization-scoped (no projectId) — all tokens visible org-wide", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.agentTokens();
    expect(Array.isArray(key)).toBe(true);
    expect(key.some((s: unknown) => typeof s === "number")).toBe(false);
  });

  it("the key contains the 'agent-tokens' segment", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.agentTokens();
    expect(key.some((s: unknown) => s === "agent-tokens")).toBe(true);
  });
});
