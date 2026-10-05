import type { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";

export function invalidateBuildViews(
  client: QueryClient,
  projectId: number,
  ticketIds: number[] = [],
  aggregates = true,
) {
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.detail(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.list(),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.allWorkAll,
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.myIssues(),
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.recentProjects(),
  });
  for (const ticketId of ticketIds) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projects.ticket(projectId, ticketId),
    });
    void client.invalidateQueries({
      queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
    });
  }
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.tickets(),
    predicate: (query) =>
      query.queryKey.includes("by-key") && query.queryKey.includes(projectId),
  });
  if (!aggregates) return;
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.cycles(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projectReports.all,
    predicate: (query) =>
      query.queryKey[
        buildWorkQueryKeys.projectReports.all.length + 1
      ] === projectId,
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.activeSprintSummary(),
  });
}

export function invalidateTicketUpdateViews(
  client: QueryClient,
  projectId: number,
  ticketId: number,
  changes: {
    title?: unknown;
    status?: unknown;
    cycleId?: unknown;
    points?: unknown;
    startDate?: unknown;
    dueDate?: unknown;
    assigneeId?: unknown;
    assigneeIds?: unknown;
  },
) {
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: accountingAndSupportQueryKeys.ticketActivity.list(ticketId),
    exact: true,
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.allWorkAll,
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.analytics(projectId),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: buildWorkQueryKeys.projects.list(),
    refetchType: "none",
  });
  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.myIssues(),
    refetchType: "none",
  });

  const titleChanged = changes.title !== undefined;
  const statusChanged = changes.status !== undefined;
  const cycleChanged = changes.cycleId !== undefined;
  const pointsChanged = changes.points !== undefined;
  const schedulingChanged =
    changes.startDate !== undefined || changes.dueDate !== undefined;

  if (!titleChanged && !statusChanged && !cycleChanged && !pointsChanged && !schedulingChanged)
    return;

  if (statusChanged || cycleChanged) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projects.columnCounts(projectId),
      refetchType: "none",
    });
  }

  if (statusChanged) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.cycleTime(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.leadTime(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.cfd(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.velocity(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.burnup(projectId),
      refetchType: "none",
    });
  }

  if (cycleChanged) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projects.cycles(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.velocity(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.burnup(projectId),
      refetchType: "none",
    });
  }

  if (pointsChanged) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.velocity(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.burnup(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
      refetchType: "none",
    });
  }

  if (titleChanged) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
      refetchType: "none",
    });
  }

  if (schedulingChanged) {
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.criticalPath(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.cycleTime(projectId),
      refetchType: "none",
    });
    void client.invalidateQueries({
      queryKey: buildWorkQueryKeys.projectReports.leadTime(projectId),
      refetchType: "none",
    });
  }

  void client.invalidateQueries({
    queryKey: collaborationQueryKeys.dashboard.activeSprintSummary(),
    refetchType: "none",
  });
}
