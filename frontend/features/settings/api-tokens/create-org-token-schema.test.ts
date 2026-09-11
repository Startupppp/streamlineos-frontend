import { orgTokenFormSchema } from "./create-org-token-schema";
import { userTokenFormSchema } from "./create-user-token-schema";

const FIXED = new Date("2026-06-01T00:00:00.000Z");
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED);
});

afterAll(() => {
  jest.useRealTimers();
});

const ORG_CEILING_MS = FIXED.getTime() + 90 * ONE_DAY_MS;

const nearFuture = new Date(FIXED.getTime() + ONE_DAY_MS).toISOString();
const past = new Date(FIXED.getTime() - ONE_DAY_MS).toISOString();
const orgCeilingInside = new Date(ORG_CEILING_MS - ONE_HOUR_MS).toISOString();
const orgCeilingOutside = new Date(ORG_CEILING_MS + ONE_HOUR_MS).toISOString();
const days180 = new Date(FIXED.getTime() + 180 * ONE_DAY_MS).toISOString();

const BASE = { name: "CI Deploy Key", expiresAt: nearFuture };

describe("orgTokenFormSchema — valid payload", () => {
  it("accepts a fully valid payload", () => {
    expect(orgTokenFormSchema.safeParse(BASE).success).toBe(true);
  });

  it("accepts a payload with optional description", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, description: "Used by CI" }).success,
    ).toBe(true);
  });

  it("accepts a payload with description omitted", () => {
    expect(orgTokenFormSchema.safeParse(BASE).success).toBe(true);
  });
});

describe("orgTokenFormSchema — required field failures", () => {
  it("rejects empty name", () => {
    expect(orgTokenFormSchema.safeParse({ ...BASE, name: "" }).success).toBe(false);
  });

  it("rejects empty expiresAt", () => {
    expect(orgTokenFormSchema.safeParse({ ...BASE, expiresAt: "" }).success).toBe(false);
  });
});

describe("orgTokenFormSchema — invalid input", () => {
  it("rejects name over 100 chars", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, name: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects description over 500 chars", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, description: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("rejects a past expiresAt", () => {
    expect(orgTokenFormSchema.safeParse({ ...BASE, expiresAt: past }).success).toBe(false);
  });
});

describe("orgTokenFormSchema — name boundary", () => {
  it("accepts name at exactly 100 chars", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, name: "a".repeat(100) }).success,
    ).toBe(true);
  });

  it("rejects name at 101 chars", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, name: "a".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("orgTokenFormSchema — description boundary", () => {
  it("accepts description at exactly 500 chars", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, description: "a".repeat(500) }).success,
    ).toBe(true);
  });

  it("rejects description at 501 chars", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, description: "a".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("orgTokenFormSchema — expiresAt 90-day ceiling", () => {
  it("accepts expiresAt 1 hour before the ceiling", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, expiresAt: orgCeilingInside }).success,
    ).toBe(true);
  });

  it("rejects expiresAt 1 hour after the ceiling", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, expiresAt: orgCeilingOutside }).success,
    ).toBe(false);
  });

  it("reports the exact ceiling error message", () => {
    const result = orgTokenFormSchema.safeParse({ ...BASE, expiresAt: orgCeilingOutside });
    expect(result.success).toBe(false);
    if (!result.success) {
      const found = result.error.issues.some(
        (i) => i.message === "CRM API keys cannot exceed 90 days",
      );
      expect(found).toBe(true);
    }
  });

  it("accepts a near-future date", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, expiresAt: nearFuture }).success,
    ).toBe(true);
  });

  it("rejects a date in the past", () => {
    expect(orgTokenFormSchema.safeParse({ ...BASE, expiresAt: past }).success).toBe(false);
  });
});

describe("orgTokenFormSchema — trim transformation", () => {
  it("trims whitespace from name", () => {
    const result = orgTokenFormSchema.safeParse({ ...BASE, name: "  Key  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Key");
  });

  it("rejects a whitespace-only name after trim", () => {
    expect(orgTokenFormSchema.safeParse({ ...BASE, name: "   " }).success).toBe(false);
  });

  it("trims whitespace from description", () => {
    const result = orgTokenFormSchema.safeParse({ ...BASE, description: "  desc  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("desc");
  });
});

describe("orgTokenFormSchema — schema differences vs userTokenFormSchema", () => {
  it("rejects a ~180-day expiresAt (exceeds the 90-day org ceiling)", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, expiresAt: days180 }).success,
    ).toBe(false);
  });

  it("accepts the same ~180-day expiresAt in userTokenFormSchema (within 366-day ceiling)", () => {
    expect(
      userTokenFormSchema.safeParse({
        name: "Dev Token",
        scopes: ["read:crm"],
        expiresAt: days180,
      }).success,
    ).toBe(true);
  });

  it("strips an unknown scopes field — payload with scopes parses successfully", () => {
    expect(
      orgTokenFormSchema.safeParse({ ...BASE, scopes: ["read:crm"] }).success,
    ).toBe(true);
  });

  it("does not include scopes in the parsed output", () => {
    const result = orgTokenFormSchema.safeParse({ ...BASE, scopes: ["read:crm"] });
    expect(result.success).toBe(true);
    if (result.success) expect("scopes" in result.data).toBe(false);
  });

  it("includes description in the org schema output", () => {
    const result = orgTokenFormSchema.safeParse({ ...BASE, description: "test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe("test");
  });
});
