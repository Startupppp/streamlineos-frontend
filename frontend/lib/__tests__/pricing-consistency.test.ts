import { PRICING, PRICING_TIERS } from "../pricing";

/**
 * Expected values from backend `plan-entitlements.constants.ts`.
 * If these fail, update PRICING / PRICING_TIERS to match the backend catalog
 * (never the other way around for chargeable prices).
 */
const BACKEND_CATALOG = {
  freeSeats: 5,
  starterMonthlyInr: 999,
  professionalMonthlyInr: 2499,
  enterpriseMonthlyInr: 4999,
  annualDiscountPct: 20,
  trialDays: 14,
  starterSeats: 10,
  professionalSeats: 50,
} as const;

describe("public pricing stays aligned with backend plan catalog", () => {
  it("matches free seat limits", () => {
    expect(PRICING.starterSeatLimit).toBe(BACKEND_CATALOG.freeSeats);
    expect(PRICING.freeSeatLimit).toBe(BACKEND_CATALOG.freeSeats);
  });

  it("matches chargeable monthly prices in INR", () => {
    expect(PRICING.starterMonthlyInr).toBe(BACKEND_CATALOG.starterMonthlyInr);
    expect(PRICING.professionalMonthlyInr).toBe(BACKEND_CATALOG.professionalMonthlyInr);
    expect(PRICING.enterpriseMonthlyInr).toBe(BACKEND_CATALOG.enterpriseMonthlyInr);
  });

  it("matches annual discount and trial days", () => {
    expect(PRICING.annualDiscountPct).toBe(BACKEND_CATALOG.annualDiscountPct);
    expect(PRICING.trialDays).toBe(BACKEND_CATALOG.trialDays);
  });

  it("uses backend plan ids for paid tiers", () => {
    const free = PRICING_TIERS.find((t) => t.planId === "FREE");
    const starter = PRICING_TIERS.find((t) => t.planId === "STARTER");
    const professional = PRICING_TIERS.find((t) => t.planId === "PROFESSIONAL");
    const enterprise = PRICING_TIERS.find((t) => t.planId === "ENTERPRISE");

    expect(free?.monthly).toBe(0);
    expect(starter?.monthly).toBe(BACKEND_CATALOG.starterMonthlyInr);
    expect(starter?.annual).toBe(
      Math.round(
        BACKEND_CATALOG.starterMonthlyInr *
          (1 - BACKEND_CATALOG.annualDiscountPct / 100),
      ),
    );
    expect(professional?.monthly).toBe(BACKEND_CATALOG.professionalMonthlyInr);
    expect(enterprise?.monthly).toBe(BACKEND_CATALOG.enterpriseMonthlyInr);
  });
});
