"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { PARTIES_READ, useParties } from "@/hooks/api/accounting/parties";
import type { PartyDetail } from "@/types/accounting-ar";

const DIRECTORY_PAGE_SIZE = 100;
const DIRECTORY_STALE = 2 * 60 * 1000;
const ENTITY_STALE = 5 * 60 * 1000;

export interface PartyNameResolver {
  resolve: (partyId: string) => string;
  isLoading: boolean;
}

export function usePartyNames(partyIds: readonly string[]): PartyNameResolver {
  const canRead = useCan(PARTIES_READ);
  const directory = useParties(
    { pageSize: DIRECTORY_PAGE_SIZE, includeInactive: true },
    { staleTime: DIRECTORY_STALE },
  );

  const known = useMemo(() => {
    const map = new Map<string, string>();
    for (const party of directory.data?.items ?? []) map.set(party.id, party.displayName);
    return map;
  }, [directory.data]);

  const idKey = useMemo(() => Array.from(new Set(partyIds)).sort().join("|"), [partyIds]);

  const missing = useMemo(
    () => (idKey ? idKey.split("|").filter((id) => id.length > 0 && !known.has(id)) : []),
    [idKey, known],
  );

  const details = useQueries({
    queries: missing.map((partyId) => ({
      queryKey: queryKeys.accountingAr.party(partyId),
      queryFn: () => apiClient.get<PartyDetail>(`/accounting/parties/${partyId}`),
      staleTime: ENTITY_STALE,
      enabled: canRead,
    })),
  });

  const resolved = useMemo(() => {
    const map = new Map(known);
    details.forEach((result) => {
      if (result.data) map.set(result.data.id, result.data.displayName);
    });
    return map;
  }, [known, details]);

  const isLoading = directory.isLoading || details.some((result) => result.isLoading);

  return {
    resolve: (partyId: string) => resolved.get(partyId) ?? (isLoading ? "Loading…" : "Customer"),
    isLoading,
  };
}
