"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useAccess, useCan } from "@/hooks/api/access";
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
  const { isPending } = useAccess();
  const canView = useCan("crm:reports:view");

  return (
    <PageWrapper
      title="Attribution"
      subtitle="The same won revenue, divided across touches five different ways."
    >
      {isPending ? (
        <LoadingState variant="page" />
      ) : !canView ? (
        <NoPermissionState
          permission="crm:reports:view"
          description="You don’t have permission to see campaign attribution."
        />
      ) : (
        <AttributionByModel />
      )}
    </PageWrapper>
  );
}
