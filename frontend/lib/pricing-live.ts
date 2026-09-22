import { BACKEND_URL } from "./backend-url";
import { PRICING_TIERS, type PricingTier } from "./pricing";
import { formatMinor } from "./pricing-format";
import type { ResponseContract } from "./api-envelope";
import {
  dataResidencyContract,
  publicPricingContract,
} from "./pricing-live-schema";

export interface PublicPlanPrice {
  readonly plan: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  readonly monthlyMinor: number;
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

async function publicGet<T>(
  path: string,
  params: Record<string, string | undefined>,
  contract: ResponseContract<T>,
  timeoutMs = 2500,
): Promise<T | null> {
  const url = new URL(`${BACKEND_URL}/${path}`);
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) url.searchParams.set(key, value);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(url.toString(), {
      signal: abort.signal,
      // Prices change rarely and a marketing page is read constantly; a minute
      // is short enough that a price change is live before anyone notices and
      // long enough that the pricing page is not a load test.
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    // The platform envelopes public responses as `{ success, data }`.
    const payload =
      body && typeof body === "object" && "data" in body ? body.data : body;
    const parsed = contract.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchPublicPricing(
  currency?: string,
): Promise<PublicPricing | null> {
  return publicGet<PublicPricing>(
    "public/pricing",
    { currency },
    publicPricingContract,
  );
}

export function fetchDataResidency(
  country?: string,
): Promise<DataResidency | null> {
  return publicGet<DataResidency>(
    "public/data-residency",
    { country },
    dataResidencyContract,
  );
}

export { formatMinor };

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
