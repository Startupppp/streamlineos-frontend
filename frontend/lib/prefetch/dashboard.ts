import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { dashboardStatsContract } from "@/lib/prefetch/prefetch-schema";
import { myIssuesContract, personalDashboardContract, hrDocumentsListContract } from "@/hooks/api/dashboard-schema";
import {
  dashboardStatsQueryOptions,
  myIssuesQueryOptions,
  personalDashboardQueryOptions,
  publicDocumentsQueryOptions,
} from "@/hooks/api/dashboard";

export async function prefetchDashboard() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);

    await Promise.all([
      queryClient.prefetchQuery({
        ...dashboardStatsQueryOptions(),
        queryFn: () =>
          serverGet<z.infer<typeof dashboardStatsContract>>(
            "/dashboard/stats",
            dashboardStatsContract,
          ),
      }),
      queryClient.prefetchQuery({
        ...personalDashboardQueryOptions(),
        queryFn: () =>
          serverGet<z.infer<typeof personalDashboardContract>>(
            "/dashboard/personal",
            personalDashboardContract,
          ),
      }),
      gate.can("build:view")
        ? queryClient.prefetchQuery({
            ...myIssuesQueryOptions(),
            queryFn: () =>
              serverGet<z.infer<typeof myIssuesContract>>(
                "/dashboard/my-issues",
                myIssuesContract,
              ),
          })
        : Promise.resolve(),
      gate.can("hr:documents:view")
        ? queryClient.prefetchQuery({
            ...publicDocumentsQueryOptions(6),
            queryFn: async () => {
              const res = await serverGet<z.infer<typeof hrDocumentsListContract>>(
                "/hr/documents?limit=6",
                hrDocumentsListContract,
              );
              return res.data;
            },
          })
        : Promise.resolve(),
    ]);

    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
