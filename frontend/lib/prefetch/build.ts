import "server-only";

import { dehydrate, type DehydratedState } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { projectDetailContract } from "@/hooks/api/build/build-project-schema";
import { cycleListContract, epicPageContract, moduleResponseContract } from "@/hooks/api/build/execution-schema";
import { milestoneListContract } from "@/hooks/api/build/workspace-schema";
import { ticketDetailContract, ticketListPageContract } from "@/hooks/api/build/build-tickets-core-schema";
import { projectDetailQueryOptions } from "@/hooks/api/build/projects";
import { cyclesQueryOptions } from "@/hooks/api/build/cycles";
import { epicPageQueryOptions } from "@/hooks/api/build/epics";
import { modulesQueryOptions } from "@/hooks/api/build/modules";
import { milestonesQueryOptions } from "@/hooks/api/build/milestones";
import { projectBoardTicketsQueryOptions, ticketByKeyQueryOptions } from "@/hooks/api/build/ticket-queries";

import type { z } from "zod";
import type { ProjectWithDetails, CursorPageResponse, Ticket } from "@/types/projects";
import type { CyclePage } from "@/hooks/api/build/cycles";
import type { EpicPage } from "@/hooks/api/build/execution-schema";

type ModulePage = z.infer<typeof moduleResponseContract>;
type MilestonePage = z.infer<typeof milestoneListContract>;

export async function prefetchBuildProject(projectId: number): Promise<{
  project: ProjectWithDetails;
  state: DehydratedState;
}> {
  const queryClient = await createServerQueryClient();
  const project = await queryClient.fetchQuery({
    ...projectDetailQueryOptions(projectId),
    queryFn: () => serverGet<ProjectWithDetails>(`/build/${projectId}`, projectDetailContract),
  });
  return { project, state: dehydrate(queryClient) };
}

export async function prefetchProjectCycles(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:cycles:view")) {
      await queryClient.prefetchQuery({
        ...cyclesQueryOptions(projectId),
        queryFn: () => serverGet<CyclePage>(`/build/${projectId}/cycles`, cycleListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectEpics(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...epicPageQueryOptions(projectId),
        queryFn: () => serverGet<EpicPage>(`/build/${projectId}/epics`, epicPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectModules(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...modulesQueryOptions(projectId),
        queryFn: () => serverGet<ModulePage>(`/build/${projectId}/modules`, moduleResponseContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectMilestones(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...milestonesQueryOptions(projectId),
        queryFn: () => serverGet<MilestonePage>(`/build/${projectId}/milestones`, milestoneListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectBoardTickets(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:tickets:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...projectBoardTicketsQueryOptions(projectId),
        queryFn: () =>
          serverGet<CursorPageResponse<Ticket>>(
            `/build/${projectId}/tickets?limit=100&orderBy=rank&orderDir=asc`,
            ticketListPageContract,
          ),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectTicketByKey(
  projectId: number,
  ticketNumber: number,
) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:tickets:view")) {
      await queryClient.prefetchQuery({
        ...ticketByKeyQueryOptions(projectId, ticketNumber),
        queryFn: () =>
          serverGet<Ticket | null>(
            `/build/${projectId}/tickets/key/${ticketNumber}`,
            ticketDetailContract,
          ),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectCyclesAndTickets(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    await Promise.all([
      gate.can("build:cycles:view")
        ? queryClient.prefetchQuery({
            ...cyclesQueryOptions(projectId),
            queryFn: () => serverGet<CyclePage>(`/build/${projectId}/cycles`, cycleListContract),
          })
        : Promise.resolve(),
      gate.can("build:tickets:view")
        ? queryClient.prefetchInfiniteQuery({
            ...projectBoardTicketsQueryOptions(projectId),
            queryFn: () =>
              serverGet<CursorPageResponse<Ticket>>(
                `/build/${projectId}/tickets?limit=100&orderBy=rank&orderDir=asc`,
                ticketListPageContract,
              ),
            pages: 1,
          })
        : Promise.resolve(),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
