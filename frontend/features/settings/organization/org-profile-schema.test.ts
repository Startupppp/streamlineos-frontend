import { orgGeneralSchema } from "./org-profile-schema";
import { INDUSTRIES } from "@/lib/constants/industries";

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

  it("INDUSTRIES list contains Agency", () => {
    expect(INDUSTRIES).toContain("Agency");
  });

  it("settings can show every industry onboarding used to save, so no edit opens blank", () => {
    for (const saved of ["IT Services", "Retail", "Construction", "Restaurant", "Logistics", "Manufacturing"]) {
      expect(INDUSTRIES).toContain(saved);
    }
    expect(new Set(INDUSTRIES).size).toBe(INDUSTRIES.length);
  });

  it("rejects a javascript: URL for website", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, website: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("rejects a whitespace-only organization name", () => {
    expect(orgGeneralSchema.safeParse({ ...BASE, name: "   " }).success).toBe(false);
  });

  it("trims surrounding whitespace from the name", () => {
    const result = orgGeneralSchema.safeParse({ ...BASE, name: "  Acme Corp  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Acme Corp");
  });

  it("rejects an invalid support phone number", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, supportPhone: "+91 12" }).success,
    ).toBe(false);
  });

  it("accepts a valid E.164 support phone number", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, supportPhone: "+919876543210" }).success,
    ).toBe(true);
  });

  it("accepts an empty support phone (optional)", () => {
    expect(
      orgGeneralSchema.safeParse({ ...BASE, supportPhone: "" }).success,
    ).toBe(true);
  });
});
