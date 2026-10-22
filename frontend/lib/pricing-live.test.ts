import {
  applyLivePrices,
  currencyNotice,
  formatMinor,
  type PublicPricing,
} from "./pricing-live";
import { PRICING_TIERS } from "./pricing";

const EUR: PublicPricing = {
  currency: "EUR",
  isRequestedCurrency: true,
  annualDiscountPct: 20,
  trialDays: 182,
  plans: [
    { plan: "FREE", monthlyMinor: 0, annualMinor: 0, seatLimit: 5 },
    { plan: "STARTER", monthlyMinor: 1900, annualMinor: 18240, seatLimit: 10 },
    { plan: "PROFESSIONAL", monthlyMinor: 4900, annualMinor: 47040, seatLimit: 50 },
  ],
};

describe("applyLivePrices", () => {
  it("quotes the live amount rather than the compiled-in one", () => {
    const starter = applyLivePrices(EUR).find((tier) => tier.planId === "STARTER");

    expect(starter?.monthly).toBe(19);
  });

  it("divides the annual charge into the per-month figure the table quotes", () => {
    const starter = applyLivePrices(EUR).find((tier) => tier.planId === "STARTER");

    expect(starter?.annual).toBe(15.2);
    expect(starter?.priceLabel.annual).toContain("15.20");
    expect(starter?.priceLabel.annual).not.toContain("182");
  });

  it("never quotes an annual figure above the monthly one", () => {
    for (const tier of applyLivePrices(EUR)) {
      if (tier.monthly === null || tier.annual === null) continue;
      expect(tier.annual).toBeLessThanOrEqual(tier.monthly);
    }
  });

  it("does not keep the static rupee price when a live price exists", () => {
    const before = PRICING_TIERS.find((tier) => tier.planId === "STARTER");
    const after = applyLivePrices(EUR).find((tier) => tier.planId === "STARTER");

    expect(after?.priceLabel.monthly).not.toBe(before?.priceLabel.monthly);
    expect(after?.priceLabel.monthly).not.toContain("₹");
  });

  it("falls back to the static table when the endpoint is unreachable", () => {
    expect(applyLivePrices(null)).toEqual([...PRICING_TIERS]);
  });

  it("leaves a plan the catalogue does not price alone", () => {
    const before = PRICING_TIERS.find((tier) => tier.planId === "ENTERPRISE");
    const after = applyLivePrices(EUR).find((tier) => tier.planId === "ENTERPRISE");

    expect(after).toEqual(before);
  });

  it("labels an unpriced free plan in the live currency, not rupees", () => {
    const { plans, ...rest } = EUR;
    const usdNoFree: PublicPricing = { ...rest, currency: "USD", plans: plans.filter((p) => p.plan !== "FREE") };
    const free = applyLivePrices(usdNoFree).find((tier) => tier.monthly === 0);

    expect(free?.price).toBe(formatMinor(0, "USD", "en"));
    expect(free?.priceLabel.annual).not.toContain("₹");
  });

  it("keeps the copy, which no API owns", () => {
    const before = PRICING_TIERS.find((tier) => tier.planId === "STARTER");
    const after = applyLivePrices(EUR).find((tier) => tier.planId === "STARTER");

    expect(after?.name).toBe(before?.name);
    expect(after?.features).toEqual(before?.features);
    expect(after?.ctaHref).toBe(before?.ctaHref);
  });
});

describe("formatMinor", () => {
  it("renders minor units as money a person reads", () => {
    expect(formatMinor(99900, "INR", "en-IN")).toContain("999");
    expect(formatMinor(1900, "EUR", "de-DE")).toContain("19");
  });

  it("shows cents only when there are cents", () => {
    expect(formatMinor(1900, "USD", "en-US")).toBe("$19");
    expect(formatMinor(1520, "USD", "en-US")).toBe("$15.20");
  });

  it("still renders an amount for a currency Intl does not know", () => {
    expect(formatMinor(1900, "XYZ")).toContain("19");
  });
});

describe("currencyNotice", () => {
  it("says so when we could not price in the currency asked for", () => {
    const notice = currencyNotice({ ...EUR, currency: "INR", isRequestedCurrency: false });

    expect(notice).toContain("INR");
    expect(notice).toContain("charged");
  });

  it("says nothing when the price is in the currency asked for", () => {
    expect(currencyNotice(EUR)).toBeNull();
  });

  it("says nothing when there are no live prices at all", () => {
    expect(currencyNotice(null)).toBeNull();
  });
});
