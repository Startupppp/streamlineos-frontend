"use client";

import type { z } from "zod";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import type { ticketActivityPageContract as ticketActivityPageContractDef } from "@/hooks/api/build/build-tickets-core-schema";

const ticketActivityPageLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-core-schema").then((m) => m.ticketActivityPageContract),
);

type TicketActivityPage = z.infer<typeof ticketActivityPageContractDef>;

export type TicketActivityEntry = TicketActivityPage["data"][number];
export type TicketActivityAction = TicketActivityEntry["action"];

export function useTicketActivity(projectId: number, ticketId: number) {
  const canView = useCan("build:tickets:view");
  const query = useInfiniteQuery({
    queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
    queryFn: ({ signal, pageParam }) =>
      apiClient.get<TicketActivityPage>(
        `/build/${projectId}/tickets/${ticketId}/activity`,
        { limit: 25, ...(pageParam === undefined ? {} : { cursor: pageParam }) },
        signal,
        ticketActivityPageLazy,
      ),
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (page) => page.pagination.nextCursor ?? undefined,
    enabled: canView && !!projectId && !!ticketId,
    staleTime: 30_000,
  });
  const data = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  return { ...query, data };
}
