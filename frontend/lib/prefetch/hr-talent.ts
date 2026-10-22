import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { serverGet } from "@/lib/server-fetch";
import { listCyclesContract } from "@/hooks/api/hr/performance-schema";
import { benefitPlansPageContract } from "@/hooks/api/hr/benefits-schema";
import { goalListContract } from "@/hooks/api/hr/goals-schema";
import { listCyclesContract as feedbackListCyclesContract } from "@/hooks/api/hr/feedback-schema";
import { hrAnalyticsOverviewContract } from "@/hooks/api/hr/analytics-schema";
import { announcementListContract } from "@/hooks/api/hr/announcements-schema";
import { kpiListContract } from "@/hooks/api/hr/kpis-schema";
import { workforcePlansContract } from "@/hooks/api/hr/workforce-schema";
import { recognitionListContract } from "@/features/hr/engagement/engagement-schema";
import { costSummaryContract } from "@/hooks/api/hr/enterprise-comp-schema";
import { hrHubSnapshotContract } from "@/hooks/api/hr/hub-schema";
import { localDateKey } from "@/hooks/api/hr/hub";

import type { z } from "zod";

type ReviewCycleList = z.infer<typeof listCyclesContract>;
type BenefitPlansPage = z.infer<typeof benefitPlansPageContract>;
type GoalList = z.infer<typeof goalListContract>;
type FeedbackCycleList = z.infer<typeof feedbackListCyclesContract>;
type HrAnalyticsOverview = z.infer<typeof hrAnalyticsOverviewContract>;
type AnnouncementList = z.infer<typeof announcementListContract>;
type KpiList = z.infer<typeof kpiListContract>;
type WorkforcePlanList = z.infer<typeof workforcePlansContract>;
type RecognitionList = z.infer<typeof recognitionListContract>;
type CostSummary = z.infer<typeof costSummaryContract>;
type HrHubSnapshot = z.infer<typeof hrHubSnapshotContract>;

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

export async function prefetchHrGoals() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.goals(),
      queryFn: () => serverGet<GoalList>("/hr/performance/goals", goalListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrFeedbackCycles() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.feedbackCycles(),
      queryFn: () => serverGet<FeedbackCycleList>("/hr/feedback/cycles", feedbackListCyclesContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrAnalyticsOverview() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "analytics"] as const,
      queryFn: () => serverGet<HrAnalyticsOverview>("/hr/analytics", hrAnalyticsOverviewContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrAnnouncements() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.announcements(),
      queryFn: () => serverGet<AnnouncementList>("/org/announcements", announcementListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrKpis() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.kpis(),
      queryFn: () => serverGet<KpiList>("/hr/kpis", kpiListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrWorkforcePlans() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "workforce", "plans"] as const,
      queryFn: () => serverGet<WorkforcePlanList>("/hr/analytics-plus/workforce/plans", workforcePlansContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrRecognition() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.hrRecognition,
      queryFn: () => serverGet<RecognitionList>("/hr/recognition", recognitionListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrWorkforceCostSummary() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCostingAll, "summary"] as const,
      queryFn: () =>
        serverGet<CostSummary>("/hr/enterprise/comp/costing/summary", costSummaryContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrHub() {
  try {
    const today = localDateKey();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.hub(today),
      queryFn: () => serverGet<HrHubSnapshot>(`/hr/hub?today=${today}`, hrHubSnapshotContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
