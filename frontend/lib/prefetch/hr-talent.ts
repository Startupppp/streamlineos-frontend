import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
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
import { costSummaryContract, listCompCyclesContract, listGrantsContract } from "@/hooks/api/hr/enterprise-comp-schema";
import { hrHubSnapshotContract } from "@/hooks/api/hr/hub-schema";
import { retentionPolicyListContract } from "@/features/hr/governance/hooks/retention-schema";
import { reviewCyclesQueryOptions } from "@/hooks/api/hr/performance-read-options";
import { benefitPlansQueryOptions } from "@/hooks/api/hr/benefits-read-options";
import { hrGoalsQueryOptions } from "@/hooks/api/hr/goals-read-options";
import { feedbackCyclesQueryOptions } from "@/hooks/api/hr/feedback-read-options";
import { hrAnalyticsQueryOptions } from "@/hooks/api/hr/analytics-read-options";
import { hrAnnouncementsQueryOptions } from "@/hooks/api/hr/announcements-read-options";
import { hrKpisQueryOptions } from "@/hooks/api/hr/kpis-read-options";
import { hrWorkforcePlansQueryOptions } from "@/hooks/api/hr/workforce-read-options";
import { recognitionQueryOptions } from "@/hooks/api/hr/engagement-read-options";
import { workforceCostSummaryQueryOptions, compCyclesQueryOptions, equityGrantsQueryOptions } from "@/hooks/api/hr/enterprise-comp-read-options";
import { hrHubQueryOptions, localDateKey } from "@/hooks/api/hr/hub-read-options";
import { retentionPoliciesQueryOptions } from "@/features/hr/governance/hooks/use-retention-read-options";

export async function prefetchHrReviewCycles() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:performance:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...reviewCyclesQueryOptions(),
      queryFn: () => serverGet("/hr/performance/cycles", listCyclesContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrBenefitPlans() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:benefits:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...benefitPlansQueryOptions(),
      queryFn: () => serverGet("/hr/benefits/plans", benefitPlansPageContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrGoals() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:performance:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...hrGoalsQueryOptions(),
      queryFn: () => serverGet("/hr/performance/goals", goalListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrFeedbackCycles() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:performance:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...feedbackCyclesQueryOptions(),
      queryFn: () => serverGet("/hr/feedback/cycles", feedbackListCyclesContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrAnalyticsOverview() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:analytics:read")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...hrAnalyticsQueryOptions(),
      queryFn: () => serverGet("/hr/analytics", hrAnalyticsOverviewContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrAnnouncements() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrAnnouncementsQueryOptions(),
      queryFn: () => serverGet("/org/announcements", announcementListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrKpis() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:performance:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...hrKpisQueryOptions(),
      queryFn: () => serverGet("/hr/kpis", kpiListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrWorkforcePlans() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:headcount:read")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...hrWorkforcePlansQueryOptions(),
      queryFn: () =>
        serverGet("/hr/analytics-plus/workforce/plans", workforcePlansContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrRecognition() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:engagement:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...recognitionQueryOptions(),
      queryFn: () => serverGet("/hr/recognition", recognitionListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrWorkforceCostSummary() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:analytics:read")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...workforceCostSummaryQueryOptions(),
      queryFn: () =>
        serverGet("/hr/enterprise/comp/costing/summary", costSummaryContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrHub() {
  try {
    const today = localDateKey();
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrHubQueryOptions(today),
      queryFn: () => serverGet(`/hr/hub?today=${today}`, hrHubSnapshotContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrCompCycles() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:compensation:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...compCyclesQueryOptions(),
      queryFn: () =>
        serverGet("/hr/enterprise/comp/planning/cycles", listCompCyclesContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrEquityGrants() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:equity:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...equityGrantsQueryOptions(),
      queryFn: () =>
        serverGet("/hr/enterprise/comp/equity/grants", listGrantsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrRetentionPolicies() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:retention:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...retentionPoliciesQueryOptions({ limit: 20 }),
      queryFn: () =>
        serverGet(
          "/hr/governance/retention/policies?limit=20",
          retentionPolicyListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
