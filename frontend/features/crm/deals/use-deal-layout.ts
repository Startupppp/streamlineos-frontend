"use client";

import { useMemo } from "react";
import type { RecordLayout } from "@/lib/renderer/layout";
import { DEAL_LAYOUT, withDealStages } from "@/lib/renderer/crm/deal-layout";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useCrmStages } from "@/hooks/api/crm/metadata";

export function useDealLayout(): RecordLayout {
  const layout = useTenantLayout(DEAL_LAYOUT);
  const { data: stages } = useCrmStages("deal");

  return useMemo(() => withDealStages(layout, stages ?? []), [layout, stages]);
}
