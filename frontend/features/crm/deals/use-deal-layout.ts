"use client";

import { useMemo } from "react";
import type { RecordLayout } from "@/lib/renderer/layout";
import { DEAL_LAYOUT, withDealStages } from "@/lib/renderer/crm/deal-layout";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { useCrmStages } from "@/hooks/api/crm/metadata";

/**
 * The deal description, arranged for this tenant and filled with its pipeline.
 *
 * One hook rather than three copies of the same two lines, because the list, the
 * form and the detail view have to agree about the stage vocabulary as much as
 * about the fields — a form offering stages the list cannot label is two
 * descriptions of one record again.
 */
export function useDealLayout(): RecordLayout {
  const layout = useTenantLayout(DEAL_LAYOUT);
  const { data: stages } = useCrmStages("deal");

  return useMemo(() => withDealStages(layout, stages ?? []), [layout, stages]);
}
