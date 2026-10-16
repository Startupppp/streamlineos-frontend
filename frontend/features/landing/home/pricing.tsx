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
        title="Simple pricing that grows with you"
        lede={`Start free with up to ${PRICING.freeSeatLimit} people. Paid plans are priced per company, and paying yearly saves ${PRICING.annualDiscountPct}%.`}
        className="mb-12"
      />
      <PricingTierGrid tiers={TIERS} />
      <p className="mt-10 text-center text-sm text-muted-foreground">
        Comparing against your current tools?{" "}
        <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4 hover:text-(--lp-accent)">
          See the full plan comparison and savings calculator
        </Link>
      </p>
    </Section>
  );
}
