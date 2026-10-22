import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { projectListPageContract } from "@/hooks/api/build/build-project-schema";
import { portfolioPageContract } from "@/hooks/api/build/portfolios-schema";
import { programPageContract } from "@/hooks/api/build/portfolios-schema";
import { teamPageContract } from "@/hooks/api/build/teams-schema";
import { managedProductPageContract } from "@/hooks/api/build/managed-products-schema";
import { roadmapPageContract } from "@/hooks/api/build/roadmap-schema";
import { templateListContract } from "@/hooks/api/build/roadmap-schema";
import { goalsListContract } from "@/hooks/api/goals-schema";
import { allWorkPageContract } from "@/hooks/api/build/build-tickets-subresource-schema";
import { projectsListQueryOptions } from "@/hooks/api/build/projects";
import { portfoliosListQueryOptions } from "@/hooks/api/build/portfolios";
import { programsListQueryOptions } from "@/hooks/api/build/programs";
import { teamsListQueryOptions } from "@/hooks/api/build/teams";
import { managedProductsListQueryOptions } from "@/hooks/api/build/managed-products";
import { roadmapItemsQueryOptions } from "@/hooks/api/build/roadmap";
import { templatesListQueryOptions } from "@/hooks/api/build/templates";
import { goalsListQueryOptions } from "@/hooks/api/goals";
import { allWorkQueryOptions } from "@/hooks/api/build/all-work-read-options";
import { commandCenterLayoutQueryOptions } from "@/hooks/api/build/dashboard-layout";
import { dashboardLayoutGetLayoutResponseSchema } from "@/contracts/build-contracts.generated";
import { approvalInboxPageContract } from "@/hooks/api/build/approvals-schema";
import { notificationListContract } from "@/hooks/api/notifications-schema";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import type { z } from "zod";
import type { ProjectListResponse, AllWorkTicket, CursorPaginatedResponse, PortfoliosPage, ProgramsPage, ManagedProductsPage } from "@/types/projects";
import type { DashboardLayoutGetLayoutResponse } from "@/contracts/build-contracts.generated";

type TeamListResponse = z.infer<typeof teamPageContract>;
type RoadmapPageResponse = z.infer<typeof roadmapPageContract>;
type TemplateListPage = z.infer<typeof templateListContract>;
type GoalsListPage = z.infer<typeof goalsListContract>;
type ApprovalInboxPage = z.infer<typeof approvalInboxPageContract>;
type NotificationListPage = z.infer<typeof notificationListContract>;

export async function prefetchBuildProjects() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...projectsListQueryOptions(),
      queryFn: () => serverGet<ProjectListResponse>("/build", projectListPageContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildPortfolios() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:portfolios:view")) {
      await queryClient.prefetchQuery({
        ...portfoliosListQueryOptions(),
        queryFn: () => serverGet<PortfoliosPage>("/build/portfolios", portfolioPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildPrograms() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:programs:view")) {
      await queryClient.prefetchQuery({
        ...programsListQueryOptions(),
        queryFn: () => serverGet<ProgramsPage>("/build/programs", programPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildTeams() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:teams:view")) {
      await queryClient.prefetchQuery({
        ...teamsListQueryOptions(),
        queryFn: () => serverGet<TeamListResponse>("/build/teams", teamPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildManagedProducts() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:managed-products:view")) {
      await queryClient.prefetchQuery({
        ...managedProductsListQueryOptions(),
        queryFn: () =>
          serverGet<ManagedProductsPage>(
            "/build/managed-products",
            managedProductPageContract,
          ),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildRoadmap() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:roadmap:view")) {
      await queryClient.prefetchQuery({
        ...roadmapItemsQueryOptions(),
        queryFn: () =>
          serverGet<RoadmapPageResponse>("/build/roadmap", roadmapPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildTemplates() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchInfiniteQuery({
      ...templatesListQueryOptions(),
      queryFn: () => serverGet<TemplateListPage>("/build/templates", templateListContract),
      pages: 1,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildGoals() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:goals:view")) {
      await queryClient.prefetchQuery({
        ...goalsListQueryOptions(),
        queryFn: async () => {
          const page = await serverGet<GoalsListPage>("/goals", goalsListContract);
          return page.items;
        },
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildCommandCenter() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:dashboard:view")) {
      await queryClient.prefetchQuery({
        ...commandCenterLayoutQueryOptions(),
        queryFn: () =>
          serverGet<DashboardLayoutGetLayoutResponse>(
            "/build/command-center/layout",
            dashboardLayoutGetLayoutResponseSchema,
          ),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildAllWork() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...allWorkQueryOptions(),
      queryFn: () =>
        serverGet<CursorPaginatedResponse<AllWorkTicket>>(
          "/build/all-work",
          allWorkPageContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildMyWork() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:tickets:view")) {
      const filters = { scope: "mine" as const, limit: 10, orderBy: "rank" as const, orderDir: "desc" as const, includeTotal: false };
      await queryClient.prefetchQuery({
        ...allWorkQueryOptions(filters),
        queryFn: () =>
          serverGet<CursorPaginatedResponse<AllWorkTicket>>(
            "/build/all-work?scope=mine&limit=10&orderBy=rank&orderDir=desc&includeTotal=false",
            allWorkPageContract,
          ),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildApprovals() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:approvals:view")) {
      await queryClient.prefetchQuery({
        queryKey: buildWorkQueryKeys.projects.approvals.inbox({ cursor: null }),
        queryFn: () => serverGet<ApprovalInboxPage>("/build/approvals/inbox", approvalInboxPageContract),
        staleTime: 120_000,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchBuildInbox() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchInfiniteQuery({
      queryKey: platformCoreQueryKeys.notifications.list({
        section: "ALL",
        sourceModule: "build",
        limit: 30,
        initialCursor: null,
        infinite: true,
      }),
      queryFn: () =>
        serverGet<NotificationListPage>(
          "/notifications?section=ALL&sourceModule=build&limit=30",
          notificationListContract,
        ),
      initialPageParam: NO_ID_CURSOR_YET,
      getNextPageParam: (lastPage: NotificationListPage) =>
        lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
      pages: 1,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
