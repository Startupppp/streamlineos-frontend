"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { DEFAULT_MONEY_DISPLAY, type MoneyDisplay } from "@/lib/format-utils";

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
    queryKey: queryKeys.organization.display(),
    queryFn: () => apiClient.get<MoneyDisplay>("/me/org-display"),
    staleTime: 30 * 60_000,
  });

  return data ?? DEFAULT_MONEY_DISPLAY;
}
