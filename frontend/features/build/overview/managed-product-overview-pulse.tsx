"use client";

import {
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Navigation,
  Target,
} from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { openOpportunityCount, percentOf } from "./overview-signals";

interface PulseProps {
  managedProductId: number;
  summary: ManagedProductSummary;
}

export function ManagedProductOverviewPulse({
  managedProductId,
  summary,
}: PulseProps) {
  const base = `/build/managed-products/${managedProductId}`;
  const { evidence, delivery, outcomes } = summary;
  const openOpportunities = openOpportunityCount(evidence.opportunitiesByState);
  const ticketPct = percentOf(
    delivery.ticketTotals.done,
    delivery.ticketTotals.total,
  );
  const hitRate = percentOf(
    outcomes.outcomeReviews.met,
    outcomes.outcomeReviews.completed,
  );
  const inFlight =
    delivery.roadmapByHorizon.now + delivery.roadmapByHorizon.next;
  return (
    <section
      aria-label="Product pulse"
      data-slot="managed-product-pulse"
      className="min-w-0"
    >
      <StatCardGrid cols={5} className="auto-rows-fr gap-2">
        <StatCard
          label="New feedback"
          value={evidence.feedbackLast30d}
          hint={`Last 30 days · ${evidence.feedbackCount} total`}
          icon={MessageSquare}
          tone="blue"
          href={`${base}/feedback`}
          wrapHint
        />
        <StatCard
          label="Opportunities"
          value={openOpportunities}
          hint={`Open · ${evidence.opportunityCount} total`}
          icon={Lightbulb}
          tone="amber"
          href={`${base}/insights`}
          wrapHint
        />
        <StatCard
          label="In flight"
          value={inFlight}
          hint={`Now + Next · ${delivery.roadmapByHorizon.later} later`}
          icon={Navigation}
          href={`${base}/roadmap`}
          wrapHint
        />
        <StatCard
          label="Tickets done"
          value={ticketPct === null ? "—" : `${ticketPct}%`}
          hint={
            delivery.ticketTotals.total === 0
              ? "No tickets linked"
              : `${delivery.ticketTotals.done} of ${delivery.ticketTotals.total}`
          }
          icon={CheckCircle2}
          tone="emerald"
          href={`${base}/projects`}
          wrapHint
        />
        <StatCard
          label="Outcomes met"
          value={hitRate === null ? "—" : `${hitRate}%`}
          hint={
            outcomes.outcomeReviews.completed === 0
              ? "No reviews yet"
              : `${outcomes.outcomeReviews.met} of ${outcomes.outcomeReviews.completed} reviews`
          }
          icon={Target}
          href={`${base}/insights`}
          wrapHint
        />
      </StatCardGrid>
    </section>
  );
}
