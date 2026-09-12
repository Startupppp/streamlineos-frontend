import {
  resolveSessionClaims,
  resolveSessionDisplayName,
} from "@/lib/auth-claims";
import type { FreshClaims, TokenClaims, SessionClaims } from "@/lib/auth-claims";

function makeFresh(overrides: Partial<FreshClaims> = {}): FreshClaims {
  return {
    name: "Alice",
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    image: "/fresh.png",
    role: "MEMBER",
    isActive: true,
    orgId: "org-fresh",
    isOrgOwner: false,
    plan: "PROFESSIONAL",
    enabledModules: ["CRM", "HR"],
    orgOnboardingCompletedAt: "2025-01-01T00:00:00.000Z",
    userOnboardingCompletedAt: "2025-01-02T00:00:00.000Z",
    organizationAccess: "active",
    suspendedOrganizationName: null,
    ...overrides,
  };
}

function makeToken(overrides: Partial<TokenClaims> = {}): TokenClaims {
  return {
    name: "Token Name",
    picture: "/token.png",
    role: "ORG_ADMIN",
    isActive: false,
    orgId: "org-token",
    isOrgOwner: true,
    orgOnboardingCompletedAt: "2020-01-01T00:00:00.000Z",
    userOnboardingCompletedAt: "2020-01-02T00:00:00.000Z",
    organizationAccess: "suspended",
    suspendedOrganizationName: "Token Corp",
    ...overrides,
  };
}

describe("resolveSessionClaims — fresh wins over token", () => {
  it("uses display name from fresh, not token.name", () => {
    const result = resolveSessionClaims(
      makeFresh({ name: "Alice", firstName: null, lastName: null }),
      makeToken({ name: "Old Token Name" }),
    );
    expect(result.name).toBe("Alice");
    // If inverted: "Old Token Name" ≠ "Alice" → test fails
  });

  it("uses fresh image over token.picture", () => {
    const result = resolveSessionClaims(
      makeFresh({ image: "/fresh.png" }),
      makeToken({ picture: "/token.png" }),
    );
    expect(result.image).toBe("/fresh.png");
  });

  it("uses fresh role even when token has a different role", () => {
    const result = resolveSessionClaims(
      makeFresh({ role: "MEMBER" }),
      makeToken({ role: "ORG_ADMIN" }),
    );
    expect(result.role).toBe("MEMBER");
    // If inverted: "ORG_ADMIN" ≠ "MEMBER" → test fails
  });

  it("uses fresh orgId over token orgId", () => {
    const result = resolveSessionClaims(
      makeFresh({ orgId: "fresh-org" }),
      makeToken({ orgId: "token-org" }),
    );
    expect(result.orgId).toBe("fresh-org");
  });

  it("uses fresh isOrgOwner=false even when token says true", () => {
    const result = resolveSessionClaims(
      makeFresh({ isOrgOwner: false }),
      makeToken({ isOrgOwner: true }),
    );
    expect(result.isOrgOwner).toBe(false);
    // If inverted: true ≠ false → a former non-owner would gain owner privileges
  });

  it("uses fresh orgOnboardingCompletedAt over stale token value", () => {
    const result = resolveSessionClaims(
      makeFresh({ orgOnboardingCompletedAt: "2025-06-01T00:00:00.000Z" }),
      makeToken({ orgOnboardingCompletedAt: "2020-01-01T00:00:00.000Z" }),
    );
    expect(result.orgOnboardingCompletedAt).toBe("2025-06-01T00:00:00.000Z");
  });

  it("uses fresh organizationAccess over stale token value", () => {
    const result = resolveSessionClaims(
      makeFresh({ organizationAccess: "active" }),
      makeToken({ organizationAccess: "suspended" }),
    );
    expect(result.organizationAccess).toBe("active");
    // If inverted: "suspended" ≠ "active" → a reactivated org would stay suspended
  });

  it("uses fresh suspendedOrganizationName=null over token value", () => {
    const result = resolveSessionClaims(
      makeFresh({ suspendedOrganizationName: null }),
      makeToken({ suspendedOrganizationName: "Token Corp" }),
    );
    expect(result.suspendedOrganizationName).toBeNull();
  });
});

describe("resolveSessionClaims — token fallback when fresh is null", () => {
  it("falls back to token.name", () => {
    const result = resolveSessionClaims(null, makeToken({ name: "Token Name" }));
    expect(result.name).toBe("Token Name");
  });

  it("falls back to token.picture for image", () => {
    const result = resolveSessionClaims(null, makeToken({ picture: "/token.png" }));
    expect(result.image).toBe("/token.png");
  });

  it("falls back to token.role", () => {
    const result = resolveSessionClaims(null, makeToken({ role: "ORG_ADMIN" }));
    expect(result.role).toBe("ORG_ADMIN");
  });

  it("falls back to token.orgId", () => {
    const result = resolveSessionClaims(null, makeToken({ orgId: "token-org" }));
    expect(result.orgId).toBe("token-org");
  });

  it("falls back to token.isOrgOwner=true", () => {
    const result = resolveSessionClaims(null, makeToken({ isOrgOwner: true }));
    expect(result.isOrgOwner).toBe(true);
  });

  it("falls back to token.orgOnboardingCompletedAt", () => {
    const result = resolveSessionClaims(
      null,
      makeToken({ orgOnboardingCompletedAt: "2020-01-01T00:00:00.000Z" }),
    );
    expect(result.orgOnboardingCompletedAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("falls back to token.userOnboardingCompletedAt", () => {
    const result = resolveSessionClaims(
      null,
      makeToken({ userOnboardingCompletedAt: "2020-01-02T00:00:00.000Z" }),
    );
    expect(result.userOnboardingCompletedAt).toBe("2020-01-02T00:00:00.000Z");
  });

  it("falls back to token.organizationAccess", () => {
    const result = resolveSessionClaims(
      null,
      makeToken({ organizationAccess: "suspended" }),
    );
    expect(result.organizationAccess).toBe("suspended");
  });

  it("falls back to token.suspendedOrganizationName", () => {
    const result = resolveSessionClaims(
      null,
      makeToken({ suspendedOrganizationName: "Token Corp" }),
    );
    expect(result.suspendedOrganizationName).toBe("Token Corp");
  });
});

describe("resolveSessionClaims — always-fresh fields, no token fallback", () => {
  it("returns null plan when fresh is null", () => {
    const result = resolveSessionClaims(null, makeToken());
    expect(result.plan).toBeNull();
  });

  it("returns empty enabledModules when fresh is null", () => {
    const result = resolveSessionClaims(null, makeToken());
    expect(result.enabledModules).toEqual([]);
  });

  it("uses fresh plan when fresh is present", () => {
    const result = resolveSessionClaims(makeFresh({ plan: "ENTERPRISE" }), makeToken());
    expect(result.plan).toBe("ENTERPRISE");
  });

  it("uses fresh enabledModules when fresh is present", () => {
    const result = resolveSessionClaims(
      makeFresh({ enabledModules: ["CRM", "HR"] }),
      makeToken(),
    );
    expect(result.enabledModules).toEqual(["CRM", "HR"]);
  });
});

describe("resolveSessionClaims — organizationAccess derivation", () => {
  it("derives 'active' from orgId when neither source provides access", () => {
    const result = resolveSessionClaims(null, { orgId: "some-org" });
    expect(result.organizationAccess).toBe("active");
  });

  it("derives 'none' when orgId is null and no access in token", () => {
    const result = resolveSessionClaims(null, { orgId: null });
    expect(result.organizationAccess).toBe("none");
  });

  it("derives 'none' when no orgId and no access in token at all", () => {
    const result = resolveSessionClaims(null, {});
    expect(result.organizationAccess).toBe("none");
  });

  it("uses token.organizationAccess before deriving from orgId", () => {
    const result = resolveSessionClaims(null, {
      orgId: "some-org",
      organizationAccess: "suspended",
    });
    expect(result.organizationAccess).toBe("suspended");
    // If derivation ran before token fallback: "active" ≠ "suspended" → test fails
  });
});

describe("resolveSessionClaims — isActive stale-token precedence", () => {
  it("fresh isActive=false wins over token isActive=true", () => {
    const result = resolveSessionClaims(
      makeFresh({ isActive: false }),
      makeToken({ isActive: true }),
    );
    expect(result.isActive).toBe(false);
    // If inverted: true ≠ false → a deactivated user would see themselves as active
  });

  it("fresh isActive=true wins over token isActive=false", () => {
    const result = resolveSessionClaims(
      makeFresh({ isActive: true }),
      makeToken({ isActive: false }),
    );
    expect(result.isActive).toBe(true);
    // If inverted: false ≠ true → a reactivated user would be locked out
  });

  it("token isActive=false is used when fresh is null", () => {
    const result = resolveSessionClaims(null, makeToken({ isActive: false }));
    expect(result.isActive).toBe(false);
  });

  it("token isActive=true is used when fresh is null", () => {
    const result = resolveSessionClaims(null, makeToken({ isActive: true }));
    expect(result.isActive).toBe(true);
  });

  it("defaults to true when fresh is null and token.isActive is absent", () => {
    const result = resolveSessionClaims(null, {});
    expect(result.isActive).toBe(true);
    // absence of the claim is not evidence of deactivation
  });

  it("defaults to true when fresh is null and token.isActive is undefined", () => {
    const result = resolveSessionClaims(null, { isActive: undefined });
    expect(result.isActive).toBe(true);
  });
});

describe("resolveSessionClaims — complete defaults with empty inputs", () => {
  it("produces safe defaults when fresh is null and token is empty", () => {
    const result = resolveSessionClaims(null, {});
    const expected: SessionClaims = {
      name: "",
      image: null,
      role: "",
      isActive: true,
      orgId: null,
      isOrgOwner: false,
      plan: null,
      enabledModules: [],
      orgOnboardingCompletedAt: null,
      userOnboardingCompletedAt: null,
      organizationAccess: "none",
      suspendedOrganizationName: null,
      isPlatformAdmin: false,
    };
    expect(result).toEqual(expected);
  });
});

describe("resolveSessionDisplayName", () => {
  it("returns name when present and non-empty", () => {
    expect(resolveSessionDisplayName({ name: "Alice" })).toBe("Alice");
  });

  it("trims whitespace from name", () => {
    expect(resolveSessionDisplayName({ name: "  Alice  " })).toBe("Alice");
  });

  it("combines firstName and lastName when no name", () => {
    expect(
      resolveSessionDisplayName({ firstName: "Alice", lastName: "Smith" }),
    ).toBe("Alice Smith");
  });

  it("uses firstName alone when lastName is absent", () => {
    expect(resolveSessionDisplayName({ firstName: "Alice" })).toBe("Alice");
  });

  it("falls back to email local part when no name components", () => {
    expect(
      resolveSessionDisplayName({ email: "alice@example.com" }),
    ).toBe("alice");
  });

  it("returns empty string when all inputs are null", () => {
    expect(
      resolveSessionDisplayName({
        name: null,
        firstName: null,
        lastName: null,
        email: null,
      }),
    ).toBe("");
  });

  it("returns empty string when called with no fields", () => {
    expect(resolveSessionDisplayName({})).toBe("");
  });
});
