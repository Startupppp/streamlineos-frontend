import Link from "next/link";
import { PRICING, PRICING_TIERS } from "@/lib/pricing";
import { PricingTierGrid } from "../components/pricing-tier-grid";
import { Section, SectionHeading } from "./section";

// "Most popular" is a claim this page cannot back with a number, so the
// landing page shows the tiers without it. /pricing is unchanged.
const TIERS = PRICING_TIERS.map((tier) => ({ ...tier, badge: undefined }));

export function Pricing() {
  return (
    <Section id="pricing">
      <SectionHeading
        title="Pricing"
        lede={`Start free with up to ${PRICING.freeSeatLimit} seats. Paid plans are billed per organisation, and annual billing saves ${PRICING.annualDiscountPct}%.`}
        className="mx-auto mb-10 text-center"
      />
      <PricingTierGrid showAppsGrid={false} tiers={TIERS} />
      <p className="mt-10 text-center text-sm text-muted-foreground">
        Comparing against your current tools?{" "}
        <Link href="/pricing" className="font-medium text-status-info-ink underline-offset-4 hover:underline">
          See the full plan comparison and savings calculator
        </Link>
      </p>
    </Section>
  );
}
