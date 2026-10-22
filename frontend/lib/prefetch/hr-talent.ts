import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { serverGet } from "@/lib/server-fetch";
import { listCyclesContract } from "@/hooks/api/hr/performance-schema";
import { benefitPlansPageContract } from "@/hooks/api/hr/benefits-schema";

import type { z } from "zod";

type ReviewCycleList = z.infer<typeof listCyclesContract>;
type BenefitPlansPage = z.infer<typeof benefitPlansPageContract>;

export async function prefetchHrReviewCycles() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.reviewCycles(),
      queryFn: () => serverGet<ReviewCycleList>("/hr/performance/cycles", listCyclesContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrBenefitPlans() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.benefitPlans(),
      queryFn: () => serverGet<BenefitPlansPage>("/hr/benefits/plans", benefitPlansPageContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
