"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { AttributionByModel } from "@/features/crm/campaigns/attribution-by-model";

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
