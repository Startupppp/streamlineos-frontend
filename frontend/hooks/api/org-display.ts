"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { DEFAULT_MONEY_DISPLAY, type MoneyDisplay } from "@/lib/format-utils";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { OrgDisplay } from "@/hooks/api/org-display-schema";

const displayContract = lazyContract(() =>
  import("@/hooks/api/org-display-schema").then((m) => m.orgDisplayContract),
);

export function useOrgDisplay(): MoneyDisplay {
  return useOrgDisplayQuery().data ?? DEFAULT_MONEY_DISPLAY;
}

export function useOrgTimeZone(): string | null {
  return useOrgDisplayQuery().data?.timezone ?? null;
}

function useOrgDisplayQuery() {
  return useQuery<OrgDisplay, Error>({
    queryKey: platformCoreQueryKeys.organization.display(),
    queryFn: ({ signal }) =>
      apiClient.get("/me/org-display", undefined, signal, displayContract),
    staleTime: 30 * 60_000,
    ...INLINE_READ_ERROR,
  });
}
