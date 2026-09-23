"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { DEFAULT_MONEY_DISPLAY, type MoneyDisplay } from "@/lib/format-utils";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

/** Deferred: every money-rendering surface imports this, and the schema pulls Zod. */
const displayContract = lazyContract(() =>
  import("@/hooks/api/org-display-schema").then((m) => m.orgDisplayContract),
);

/**
 * The currency this organisation's money renders in.
 *
 * Deliberately not `useOrgSettings`, which is gated on `settings:view` — a
 * salesperson holding only `crm:deals:read` sees money on their own pipeline and
 * would be shown the wrong symbol. `GET /me/org-display` carries the currency and
 * nothing else, so it needs no permission.
 *
 * Catalog-tier staleness: an organisation changes currency roughly never, and
 * `useUpdateOrgSettings` invalidates this key when it does.
 */
export function useOrgDisplay(): MoneyDisplay {
  const { data } = useQuery<MoneyDisplay, Error>({
    queryKey: platformCoreQueryKeys.organization.display(),
    queryFn: ({ signal }) =>
      apiClient.get("/me/org-display", undefined, signal, displayContract),
    staleTime: 30 * 60_000,
    ...INLINE_READ_ERROR,
  });

  return data ?? DEFAULT_MONEY_DISPLAY;
}
