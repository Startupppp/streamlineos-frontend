"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { AttributionByModel } from "@/features/crm/campaigns/attribution-by-model";

/**
 * CRM-P1-01. Which campaigns won the revenue, under a model you choose.
 *
 * A static segment beside `[campaignId]`, which Next matches first — the two
 * cannot collide.
 *
 * Gated on `crm:reports:view`, the same key the single-touch reports use. That
 * is the backend's reasoning too: multi-touch is different arithmetic over
 * touches that key already discloses, not a wider disclosure.
 */
export default function CampaignAttributionPage() {
  const pageState = usePageState({
    permission: "crm:reports:view",
    isLoading: false,
    isError: false,
    error: undefined,
  });

  return (
    <PageWrapper
      title="Attribution"
      subtitle="The same won revenue, divided across touches five different ways."
    >
      <PageState resolution={pageState} loading={null} className="flex-1">
        <AttributionByModel />
      </PageState>
    </PageWrapper>
  );
}
