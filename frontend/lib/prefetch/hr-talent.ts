import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
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
import { reviewCyclesQueryOptions } from "@/hooks/api/hr/performance";
import { benefitPlansQueryOptions } from "@/hooks/api/hr/benefits";
import { hrGoalsQueryOptions } from "@/hooks/api/hr/goals";
import { feedbackCyclesQueryOptions } from "@/hooks/api/hr/feedback";
import { hrAnalyticsQueryOptions } from "@/hooks/api/hr/analytics";
import { hrAnnouncementsQueryOptions } from "@/hooks/api/hr/announcements";
import { hrKpisQueryOptions } from "@/hooks/api/hr/kpis";
import { hrWorkforcePlansQueryOptions } from "@/hooks/api/hr/workforce";
import { recognitionQueryOptions } from "@/hooks/api/hr/engagement";
import { workforceCostSummaryQueryOptions } from "@/hooks/api/hr/enterprise-comp";
import { hrHubQueryOptions, localDateKey } from "@/hooks/api/hr/hub";

export async function prefetchHrReviewCycles() {
  try {
    const opts = reviewCyclesQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/performance/cycles", listCyclesContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrBenefitPlans() {
  try {
    const opts = benefitPlansQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/benefits/plans", benefitPlansPageContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrGoals() {
  try {
    const opts = hrGoalsQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/performance/goals", goalListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrFeedbackCycles() {
  try {
    const opts = feedbackCyclesQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/feedback/cycles", feedbackListCyclesContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrAnalyticsOverview() {
  try {
    const opts = hrAnalyticsQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/analytics", hrAnalyticsOverviewContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrAnnouncements() {
  try {
    const opts = hrAnnouncementsQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/org/announcements", announcementListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrKpis() {
  try {
    const opts = hrKpisQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/kpis", kpiListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrWorkforcePlans() {
  try {
    const opts = hrWorkforcePlansQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () =>
        serverGet("/hr/analytics-plus/workforce/plans", workforcePlansContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrRecognition() {
  try {
    const opts = recognitionQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet("/hr/recognition", recognitionListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrWorkforceCostSummary() {
  try {
    const opts = workforceCostSummaryQueryOptions();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () =>
        serverGet("/hr/enterprise/comp/costing/summary", costSummaryContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrHub() {
  try {
    const today = localDateKey();
    const opts = hrHubQueryOptions(today);
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...opts,
      queryFn: () => serverGet(`/hr/hub?today=${today}`, hrHubSnapshotContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
