import type { ComboboxOption } from "@/components/ui/combobox";
import { useProject } from "@/hooks/api/build/projects";
import { usePortalChangeRequests } from "@/hooks/api/build/client-portal";
import { useTickets } from "@/hooks/api/build/tickets";
import { useProjectMilestones, useProjectBudget } from "@/hooks/api/build/milestones";
import { useReleases } from "@/hooks/api/build/releases";
import { useChangeRequests } from "@/hooks/api/build/change-requests";
import { useTimesheetEntries } from "@/hooks/api/timesheets-core/entries";
import { useProjectFiles } from "@/hooks/api/build/project-files";
import type { ApprovalEntityType } from "@/types/projects";

export interface EntityItem extends ComboboxOption {
  rawTitle: string;
  version?: number;
}

export type SelectionState = {
  task: { id: string; version?: number } | null;
  error: unknown;
  blocked: boolean;
};

export function useEntityItems(
  projectId: number,
  entityType: ApprovalEntityType,
): { items: EntityItem[]; isFetching: boolean } {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";
  const idFor = (type: ApprovalEntityType) =>
    entityType === type ? projectId : 0;

  const { data: ticketsData, isFetching: ticketsFetching } = useTickets(
    idFor("task"),
    { limit: 50 },
  );
  const { data: milestonesPage, isFetching: milestonesFetching } =
    useProjectMilestones(idFor("milestone"));
  const { data: releasesPage, isFetching: releasesFetching } = useReleases(
    idFor("release"),
  );
  const milestones = milestonesPage?.data;
  const releases = releasesPage?.data;
  const { data: changeRequests, isFetching: crFetching } = useChangeRequests(
    idFor("change_request"),
  );
  const { data: timesheetData, isFetching: timesheetFetching } =
    useTimesheetEntries(
      { projectId, limit: 50 },
      entityType === "timesheet" && projectId > 0,
    );
  const { data: budget, isFetching: budgetFetching } = useProjectBudget(
    idFor("budget"),
  );
  const { data: projectFiles, isFetching: filesFetching } = useProjectFiles(
    idFor("document"),
  );
  const portalLookup = entityType === "client_approval" && projectId > 0;
  const { data: portalCRs, isFetching: portalCRFetching } =
    usePortalChangeRequests(projectId, { enabled: portalLookup });

  if (entityType === "task") {
    const tickets = ticketsData?.data ?? [];
    return {
      items: tickets.map(
        (t): EntityItem => ({
          value: String(t.id),
          label: projectKey
            ? `${projectKey}-${t.ticketNumber} · ${t.title}`
            : t.title,
          sublabel: t.status,
          rawTitle: t.title,
          version: t.version,
        }),
      ),
      isFetching: ticketsFetching,
    };
  }

  if (entityType === "milestone") {
    return {
      items: (milestones ?? []).map(
        (m): EntityItem => ({
          value: String(m.id),
          label: m.name,
          sublabel: m.status ?? undefined,
          rawTitle: m.name,
        }),
      ),
      isFetching: milestonesFetching,
    };
  }

  if (entityType === "release") {
    return {
      items: (releases ?? []).map(
        (r): EntityItem => ({
          value: String(r.id),
          label: `${r.name} (${r.version})`,
          sublabel: r.status,
          rawTitle: r.name,
        }),
      ),
      isFetching: releasesFetching,
    };
  }

  if (entityType === "change_request") {
    return {
      items: (changeRequests?.data ?? []).map(
        (cr): EntityItem => ({
          value: String(cr.id),
          label: `CR-${cr.crNumber}: ${cr.title}`,
          sublabel: cr.status,
          rawTitle: cr.title,
        }),
      ),
      isFetching: crFetching,
    };
  }

  if (entityType === "timesheet") {
    return {
      items: (timesheetData?.data ?? []).map(
        (entry): EntityItem => ({
          value: String(entry.id),
          label: `${entry.date} — ${entry.description ?? entry.ticket?.title ?? "(no description)"}`,
          sublabel: `${entry.hours}h · ${entry.status}`,
          rawTitle:
            entry.description ??
            entry.ticket?.title ??
            `Entry ${entry.id}`,
        }),
      ),
      isFetching: timesheetFetching,
    };
  }

  if (entityType === "budget") {
    return {
      items: budget
        ? [
            {
              value: String(budget.projectId),
              label: "Project Budget",
              rawTitle: "Project Budget",
            } satisfies EntityItem,
          ]
        : [],
      isFetching: budgetFetching,
    };
  }

  if (entityType === "document") {
    return {
      items: projectFiles.map(
        (f): EntityItem => ({
          value: String(f.id),
          label: f.fileName,
          sublabel: f.mimeType,
          rawTitle: f.fileName,
        }),
      ),
      isFetching: filesFetching,
    };
  }

  if (entityType === "client_approval") {
    return {
      items: (portalCRs ?? []).map(
        (cr): EntityItem => ({
          value: String(cr.id),
          label: `CR-${cr.crNumber}: ${cr.title}`,
          sublabel: cr.status,
          rawTitle: cr.title,
        }),
      ),
      isFetching: portalCRFetching,
    };
  }

  return { items: [], isFetching: false };
}
