import { userTokenFormSchema } from "./create-user-token-schema";
import { orgTokenFormSchema } from "./create-org-token-schema";

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

const USER_CEILING_MS = FIXED.getTime() + 366 * ONE_DAY_MS;

const nearFuture = new Date(FIXED.getTime() + ONE_DAY_MS).toISOString();
const past = new Date(FIXED.getTime() - ONE_DAY_MS).toISOString();
const userCeilingInside = new Date(USER_CEILING_MS - ONE_HOUR_MS).toISOString();
const userCeilingOutside = new Date(USER_CEILING_MS + ONE_HOUR_MS).toISOString();
const days180 = new Date(FIXED.getTime() + 180 * ONE_DAY_MS).toISOString();

const BASE = { name: "Local Dev Token", scopes: ["read:crm"], expiresAt: nearFuture };

describe("userTokenFormSchema — valid payload", () => {
  it("accepts a fully valid payload", () => {
    expect(userTokenFormSchema.safeParse(BASE).success).toBe(true);
  });

  it("accepts multiple scopes", () => {
    expect(
      userTokenFormSchema.safeParse({
        ...BASE,
        scopes: ["read:crm", "write:build"],
      }).success,
    ).toBe(true);
  });
});

describe("userTokenFormSchema — required field failures", () => {
  it("rejects empty name", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, name: "" }).success).toBe(false);
  });

  it("rejects empty expiresAt", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, expiresAt: "" }).success).toBe(false);
  });

  it("rejects empty scopes array", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, scopes: [] }).success).toBe(false);
  });
});

describe("userTokenFormSchema — invalid input", () => {
  it("rejects name over 100 chars", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, name: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects a past expiresAt", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, expiresAt: past }).success).toBe(false);
  });
});

describe("userTokenFormSchema — name boundary", () => {
  it("accepts name at exactly 100 chars", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, name: "a".repeat(100) }).success,
    ).toBe(true);
  });

  it("rejects name at 101 chars", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, name: "a".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("userTokenFormSchema — expiresAt 366-day ceiling", () => {
  it("accepts expiresAt 1 hour before the ceiling", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, expiresAt: userCeilingInside }).success,
    ).toBe(true);
  });

  it("rejects expiresAt 1 hour after the ceiling", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, expiresAt: userCeilingOutside }).success,
    ).toBe(false);
  });

  it("reports the exact ceiling error message", () => {
    const result = userTokenFormSchema.safeParse({ ...BASE, expiresAt: userCeilingOutside });
    expect(result.success).toBe(false);
    if (!result.success) {
      const found = result.error.issues.some(
        (i) => i.message === "Personal tokens cannot exceed one year",
      );
      expect(found).toBe(true);
    }
  });

  it("accepts a near-future date", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, expiresAt: nearFuture }).success,
    ).toBe(true);
  });

  it("rejects a date in the past", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, expiresAt: past }).success).toBe(false);
  });
});

describe("userTokenFormSchema — trim transformation", () => {
  it("trims whitespace from name", () => {
    const result = userTokenFormSchema.safeParse({ ...BASE, name: "  Key  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Key");
  });

  it("rejects a whitespace-only name after trim", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, name: "   " }).success).toBe(false);
  });
});

describe("userTokenFormSchema — schema differences vs orgTokenFormSchema", () => {
  it("accepts a ~180-day expiresAt (within the 366-day user ceiling)", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, expiresAt: days180 }).success,
    ).toBe(true);
  });

  it("rejects the same ~180-day expiresAt in orgTokenFormSchema (exceeds the 90-day ceiling)", () => {
    expect(
      orgTokenFormSchema.safeParse({ name: "API Key", expiresAt: days180 }).success,
    ).toBe(false);
  });

  it("requires scopes — empty array is rejected", () => {
    expect(userTokenFormSchema.safeParse({ ...BASE, scopes: [] }).success).toBe(false);
  });

  it("strips an unknown description field — payload with description parses successfully", () => {
    expect(
      userTokenFormSchema.safeParse({ ...BASE, description: "some desc" }).success,
    ).toBe(true);
  });

  it("does not include description in the parsed output", () => {
    const result = userTokenFormSchema.safeParse({ ...BASE, description: "some desc" });
    expect(result.success).toBe(true);
    if (result.success) expect("description" in result.data).toBe(false);
  });
});
