import "server-only";

import type { z } from "zod";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { dashboardStatsContract } from "@/lib/prefetch/prefetch-schema";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { moduleChecklistListContract } from "@/hooks/api/onboarding-flow-schema";
import { getServerAccess } from "@/lib/rbac/get-server-access";
import { grantsPermission } from "@/lib/rbac/permission-gate";

export async function prefetchDashboardStats() {
  try {
    const [queryClient, access] = await Promise.all([
      createServerQueryClient(),
      getServerAccess(),
    ]);

    const prefetchStats = queryClient.prefetchQuery({
      queryKey: collaborationQueryKeys.dashboard.stats(),
      queryFn: () => serverGet<z.infer<typeof dashboardStatsContract>>("/dashboard/stats", dashboardStatsContract),
      staleTime: 5 * 60_000,
    });

    const prefetchModuleChecklists = grantsPermission(access, "onboarding:module-checklists:view")
      ? queryClient.prefetchQuery({
          queryKey: platformCoreQueryKeys.onboardingFlow.moduleChecklists(),
          queryFn: () => serverGet<z.infer<typeof moduleChecklistListContract>>("/onboarding/module-checklists", moduleChecklistListContract),
          staleTime: 30_000,
        })
      : Promise.resolve();

    await Promise.all([prefetchStats, prefetchModuleChecklists]);

    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
