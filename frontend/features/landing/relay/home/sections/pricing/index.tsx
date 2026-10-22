import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import type { PricingContent } from "@/features/landing/relay/data/pricing";

import { PlanBoard } from "./plan-board";

export const Pricing = ({ head, meter, tiers }: PricingContent) => (
  <section
    id="pricing"
    aria-label="Pricing"
    className="[content-visibility:auto] relative h-219.5 w1024:h-391.5 w768:h-498.25 w390:h-640"
  >
    <SectionHead
      {...head}
      className="absolute top-0 left-20 w1024:top-20 w1024:left-12 w1024:w-232 w768:top-10 w768:left-10 w768:w-172 w390:top-12 w390:left-5 w390:w-87.5"
    />
    <PlanBoard meter={meter} tiers={tiers} />
  </section>
);
