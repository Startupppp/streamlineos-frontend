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
  trialDays: 14,
  plans: [
    // As `GET /public/pricing` actually answers: `annualMinor` is the whole
    // year. 1900 x 12 x 0.8 = 18240. An earlier fixture here invented 1520 --
    // the monthly equivalent -- and the conversion bug it was hiding only
    // showed up against the running service.
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

  /**
   * The bug the live service found, which no fixture would have.
   *
   * The API returns what is charged for a whole year; the table quotes per seat
   * per month on annual billing. Reading one as the other puts EUR 182.40 next
   * to EUR 19.00 -- twelve times the price, and entirely plausible-looking.
   */
  it("divides the annual charge into the per-month figure the table quotes", () => {
    const starter = applyLivePrices(EUR).find((tier) => tier.planId === "STARTER");

    expect(starter?.annual).toBe(15.2);
    expect(starter?.priceLabel.annual).toContain("15.20");
    expect(starter?.priceLabel.annual).not.toContain("182");
  });

  it("never quotes an annual figure above the monthly one", () => {
    // The discount only ever makes it cheaper. This catches the inversion
    // whatever shape a future response takes.
    for (const tier of applyLivePrices(EUR)) {
      if (tier.monthly === null || tier.annual === null) continue;
      expect(tier.annual).toBeLessThanOrEqual(tier.monthly);
    }
  });

  /**
   * The failure this exists to prevent, and it is a sales failure rather than a
   * crash: a marketing page with its own copy of the prices eventually quotes a
   * number the checkout does not charge.
   */
  it("does not keep the static rupee price when a live price exists", () => {
    const before = PRICING_TIERS.find((tier) => tier.planId === "STARTER");
    const after = applyLivePrices(EUR).find((tier) => tier.planId === "STARTER");

    expect(after?.priceLabel.monthly).not.toBe(before?.priceLabel.monthly);
    expect(after?.priceLabel.monthly).not.toContain("₹");
  });

  /**
   * A page that renders nothing because an API is down is worse than one
   * quoting a price that is a fortnight stale.
   */
  it("falls back to the static table when the endpoint is unreachable", () => {
    expect(applyLivePrices(null)).toEqual([...PRICING_TIERS]);
  });

  it("leaves a plan the catalogue does not price alone", () => {
    // ENTERPRISE is quoted "from" a number and then negotiated, so its absence
    // from the catalogue is not a missing price.
    const before = PRICING_TIERS.find((tier) => tier.planId === "ENTERPRISE");
    const after = applyLivePrices(EUR).find((tier) => tier.planId === "ENTERPRISE");

    expect(after).toEqual(before);
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

  /**
   * An unrecognised code must still render a number.
   *
   * `Intl` throws on an unknown currency, and a thrown formatter on a marketing
   * page is a blank page -- a worse outcome than an unfamiliar prefix.
   */
  it("still renders an amount for a currency Intl does not know", () => {
    expect(formatMinor(1900, "XYZ")).toContain("19");
  });
});

describe("currencyNotice", () => {
  /**
   * A prospect shown a number without being told which currency it is in finds
   * out at checkout, which is the worst possible moment.
   */
  it("says so when we could not price in the currency asked for", () => {
    const notice = currencyNotice({ ...EUR, currency: "INR", isRequestedCurrency: false });

    expect(notice).toContain("INR");
    expect(notice).toContain("charged");
  });

  it("says nothing when the price is in the currency asked for", () => {
    expect(currencyNotice(EUR)).toBeNull();
  });

  it("says nothing when there are no live prices at all", () => {
    // The static table is rupees and the page says so in its own copy; adding a
    // second, contradictory notice would be worse than silence.
    expect(currencyNotice(null)).toBeNull();
  });
});
