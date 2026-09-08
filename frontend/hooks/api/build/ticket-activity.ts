"use client";

import type { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import type { ticketActivityPageContract as ticketActivityPageContractDef } from "@/hooks/api/build/build-tickets-schema";

const ticketActivityPageLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-schema").then((m) => m.ticketActivityPageContract),
);

type TicketActivityPage = z.infer<typeof ticketActivityPageContractDef>;

export type TicketActivityEntry = TicketActivityPage["data"][number];
export type TicketActivityAction = TicketActivityEntry["action"];

export function useTicketActivity(projectId: number, ticketId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketActivityPage, Error, TicketActivityEntry[]>({
    queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketActivityPage>(
        `/build/${projectId}/tickets/${ticketId}/activity`,
        undefined,
        signal,
        ticketActivityPageLazy,
      ),
    select: (page) => page.data,
    enabled: canView && !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}
