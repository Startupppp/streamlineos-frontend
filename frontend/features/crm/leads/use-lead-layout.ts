"use client";

import { useMemo } from "react";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import { LEAD_LAYOUT, withLeadOptions } from "@/lib/renderer/crm/lead-layout";
import type { RecordLayout } from "@/lib/renderer/layout";

/**
 * The lead description, filled with this tenant's vocabulary and then arranged
 * the way they arranged it.
 *
 * Every lead surface calls this instead of `useTenantLayout(LEAD_LAYOUT)`, for
 * the same reason every surface calls `useTenantLayout` instead of using the
 * constant: a fact that is true of leads everywhere belongs to the description,
 * not to whichever screen remembered to look it up. The surfaces this replaced
 * each reached for `useCrmMetadata` and `resolveOption` at the point of drawing
 * a badge, so a screen that forgot showed the shipped English label to a tenant
 * who had renamed the status months ago — and there was no single place to fix
 * it.
 *
 * The order matters. Metadata first, tenant arrangement second: the arrangement
 * hides and reorders fields, and it must act on the vocabulary the tenant
 * actually sees. Reversed, a status hidden by an administrator could be handed
 * back by the metadata overlay.
 *
 * The three option queries share one request. `useCrmOptions` is `select` over a
 * single `/crm/metadata` query, so asking for three types costs one fetch.
 */
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
