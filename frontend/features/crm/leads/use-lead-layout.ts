"use client";

import { useMemo } from "react";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import { LEAD_LAYOUT, withLeadOptions } from "@/lib/renderer/crm/lead-layout";
import type { RecordLayout } from "@/lib/renderer/layout";

export function useLeadLayout(): RecordLayout {
  const { data: statusOptions } = useCrmOptions("lead_status");
  const { data: priorityOptions } = useCrmOptions("priority");
  const { data: sourceOptions } = useCrmOptions("source");

  const described = useMemo(
    () =>
      withLeadOptions(LEAD_LAYOUT, {
        status: statusOptions,
        priority: priorityOptions,
        source: sourceOptions,
      }),
    [statusOptions, priorityOptions, sourceOptions],
  );

  return useTenantLayout(described);
}
