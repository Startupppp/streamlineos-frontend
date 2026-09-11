import "server-only";

import type { z } from "zod";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { dashboardStatsContract } from "@/lib/prefetch/prefetch-schema";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import type { DashboardStats } from "@/types/dashboard";

export async function prefetchDashboardStats() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: collaborationQueryKeys.dashboard.stats(),
      queryFn: () => serverGet<z.infer<typeof dashboardStatsContract>>("/dashboard/stats", dashboardStatsContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
