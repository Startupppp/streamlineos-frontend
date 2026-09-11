import { orgGeneralSchema, INDUSTRIES } from "./org-profile-schema";

const BASE = {
  name: "Acme Corp",
  slug: "acme-corp",
};

describe("organization profile form", () => {
  it("accepts a minimal valid payload", () => {
    expect(orgGeneralSchema.safeParse(BASE).success).toBe(true);
  });

  it("requires a non-empty name", () => {
    expect(orgGeneralSchema.safeParse({ ...BASE, name: "" }).success).toBe(false);
  });

  it("requires a non-empty slug", () => {
    expect(orgGeneralSchema.safeParse({ ...BASE, slug: "" }).success).toBe(false);
  });

  it("rejects a slug with uppercase letters", () => {
    expect(orgGeneralSchema.safeParse({ ...BASE, slug: "Acme-Corp" }).success).toBe(false);
  });

  it("rejects a slug with spaces", () => {
    expect(orgGeneralSchema.safeParse({ ...BASE, slug: "acme corp" }).success).toBe(false);
  });

  it("accepts a slug of lowercase letters, numbers, and hyphens", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, slug: "acme-123" }).success,
    ).toBe(true);
  });

  it("rejects a slug longer than 50 characters", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, slug: "a".repeat(51) }).success,
    ).toBe(false);
  });

  it("rejects an invalid website URL", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, website: "not-a-url" }).success,
    ).toBe(false);
  });

  it("accepts an empty string for the optional website field", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, website: "" }).success,
    ).toBe(true);
  });

  it("accepts a valid website URL", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, website: "https://acme.com" }).success,
    ).toBe(true);
  });

  it("rejects an invalid support email", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, supportEmail: "not-an-email" }).success,
    ).toBe(false);
  });

  it("accepts an empty string for the optional support email", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, supportEmail: "" }).success,
    ).toBe(true);
  });

  it("INDUSTRIES list is non-empty and contains expected values", () => {
    expect(INDUSTRIES.length).toBeGreaterThan(0);
    expect(INDUSTRIES).toContain("Technology");
    expect(INDUSTRIES).toContain("Other");
  });
});
