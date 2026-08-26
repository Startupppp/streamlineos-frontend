/**
 * The server's own route to the backend, not the browser's.
 *
 * `BACKEND_URL` prefers `API_INTERNAL_URL` when it is set and falls back to
 * `NEXT_PUBLIC_API_URL`. Both of these reads happen during a server render, and
 * in any deployment where the frontend and the API are separate services the
 * public URL is not reachable from inside the network -- so reading
 * `NEXT_PUBLIC_API_URL` directly, as this file first did, works on a laptop and
 * quietly falls back to stale prices in production.
 *
 * It also imports `server-only`, which turns "somebody made this a client
 * component" from a runtime mystery into a build error.
 */
import { BACKEND_URL } from "./backend-url";
import { PRICING_TIERS, type PricingTier } from "./pricing";

/**
 * Prices on the marketing page, from the same table that charges the card.
 *
 * Phase 3, ticket 12. `lib/pricing.ts` is a hand-maintained copy of the plan
 * catalogue, kept honest by a test, and its own header explains why: "this file
 * is only for landing pages that cannot call auth APIs." That was true until
 * `GET /public/pricing` existed. It needs no session, so the page that quotes a
 * price can now read the number that will actually be charged.
 *
 * Two things this fixes, both of which cost a sale rather than crash a page:
 *
 *   **The quoted price could drift from the charged one.** A synchronisation
 *   test catches a mismatch in CI, which is the wrong place — by then somebody
 *   has already had to notice. Reading one source cannot drift at all.
 *
 *   **Every price was in rupees.** A prospect in Berlin was quoted INR, or
 *   worse, quoted a number with no currency and found out at checkout.
 *
 * The static table stays as the fallback, and that is deliberate: a marketing
 * page that renders nothing because an API is down is worse than one quoting a
 * price that is a fortnight stale.
 */

export interface PublicPlanPrice {
  readonly plan: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  readonly monthlyMinor: number;
  /**
   * The whole year, not a month of it.
   *
   * `annualPrice()` on the server returns what is charged in one go -- twelve
   * months less the discount -- so STARTER at 1900/month is 18240, not 1520.
   * The marketing table quotes a *per-seat-per-month* figure on annual billing,
   * which is this divided by twelve. Reading one as the other quotes a price
   * twelve times too high, and it looks entirely plausible on the page.
   */
  readonly annualMinor: number;
  readonly seatLimit: number | null;
}

export interface PublicPricing {
  readonly currency: string;
  /** False when we do not price in the currency asked for. The page must say so. */
  readonly isRequestedCurrency: boolean;
  readonly annualDiscountPct: number;
  readonly trialDays: number;
  readonly plans: readonly PublicPlanPrice[];
}

export interface ResidencyOption {
  readonly region: string;
  /** Human-readable placement, e.g. "European Union (Ireland)". */
  readonly description: string;
  /** Countries that land here, which is what a reader actually scans for. */
  readonly examples?: readonly string[];
}

export interface DataResidency {
  readonly options: readonly ResidencyOption[];
  readonly likely?: {
    readonly region: string;
    readonly description: string;
    /** Whether the country is actually mapped, or fell to the default. */
    readonly isMapped: boolean;
  };
}


/**
 * A public read that is allowed to fail.
 *
 * Short timeout and a null return rather than a throw, because every caller's
 * correct response to a failure is the same: use the static table. Throwing
 * would make each of them write that out.
 */
async function publicGet<T>(path: string, timeoutMs = 2500): Promise<T | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(`${BACKEND_URL}/${path}`, {
      signal: abort.signal,
      // Prices change rarely and a marketing page is read constantly; a minute
      // is short enough that a price change is live before anyone notices and
      // long enough that the pricing page is not a load test.
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    // The platform envelopes public responses as `{ success, data }`.
    if (body && typeof body === "object" && "data" in body) {
      return (body as { data: T }).data;
    }
    return body as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchPublicPricing(currency?: string): Promise<PublicPricing | null> {
  const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
  return publicGet<PublicPricing>(`public/pricing${query}`);
}

export function fetchDataResidency(country?: string): Promise<DataResidency | null> {
  const query = country ? `?country=${encodeURIComponent(country)}` : "";
  return publicGet<DataResidency>(`public/data-residency${query}`);
}

/**
 * Money for reading, which is a different job from money for charging.
 *
 * The backend renders invoice amounts without `Intl` on purpose -- an invoice
 * has to reproduce byte-identically in eighteen months, and `Intl` output moves
 * with the ICU version. This is a price on a web page: it is read once, by a
 * person, in their own conventions, and never has to reproduce. So `Intl` is
 * exactly right here and exactly wrong there.
 */
export function formatMinor(minor: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    // An unknown currency code must still render a number rather than nothing.
    return `${currency} ${(minor / 100).toLocaleString(locale)}`;
  }
}

/**
 * The live numbers, laid over the static tiers.
 *
 * Only the amounts are replaced. Names, features, calls to action and ordering
 * are marketing copy that no API should own, and a plan the catalogue does not
 * price keeps whatever the static table said -- ENTERPRISE is quoted "from" a
 * number and negotiated, so an absent price is not a missing one.
 */
export function applyLivePrices(
  pricing: PublicPricing | null,
  locale = "en",
  tiers: readonly PricingTier[] = PRICING_TIERS,
): PricingTier[] {
  if (!pricing) return [...tiers];

  const byPlan = new Map(pricing.plans.map((price) => [price.plan, price]));

  return tiers.map((tier) => {
    const live = byPlan.get(tier.planId);
    if (!live) return tier;

    /**
     * Per seat per month, on annual billing -- which is what the table quotes.
     *
     * The API returns the amount actually charged for a year. Dividing is the
     * whole of the conversion, and getting it wrong quotes twelve times the
     * price in a way that looks perfectly reasonable next to the monthly one.
     */
    const annualMonthlyMinor = Math.round(live.annualMinor / 12);

    return {
      ...tier,
      monthly: live.monthlyMinor / 100,
      annual: annualMonthlyMinor / 100,
      priceLabel: {
        monthly: formatMinor(live.monthlyMinor, pricing.currency, locale),
        annual: formatMinor(annualMonthlyMinor, pricing.currency, locale),
      },
      price: formatMinor(live.monthlyMinor, pricing.currency, locale),
    };
  });
}

/**
 * What to tell somebody when we could not price in their currency.
 *
 * Returning a sentence rather than a boolean because the honest thing to say
 * depends on which currency they got, and a caller handed a boolean has to
 * reconstruct that.
 */
export function currencyNotice(pricing: PublicPricing | null): string | null {
  if (!pricing || pricing.isRequestedCurrency) return null;
  return `Shown in ${pricing.currency}. We do not price in your local currency yet, and you will be charged in ${pricing.currency}.`;
}
