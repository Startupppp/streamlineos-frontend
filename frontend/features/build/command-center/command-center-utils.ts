import type { MyWorkItem } from "@/types/projects/my-work";

export type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function resolveMyIssuesEmptyActions(params: {
  hasProjects: boolean;
  canCreateIssue: boolean;
  canCreateProject: boolean;
  onCreateIssue: () => void;
  onCreateProject: () => void;
}): { action: EmptyAction; secondaryAction?: EmptyAction } {
  const {
    hasProjects,
    onCreateIssue,
    canCreateIssue,
    onCreateProject,
    canCreateProject,
  } = params;
  if (hasProjects && canCreateIssue)
    return {
      action: { label: "New issue", onClick: onCreateIssue },
      secondaryAction: { label: "View all", href: "/build/my-work" },
    };

  if (canCreateProject)
    return {
      action: { label: "New project", onClick: onCreateProject },
      secondaryAction: hasProjects
        ? { label: "View all", href: "/build/my-work" }
        : { label: "All projects", href: "/build" },
    };

  if (hasProjects)
    return { action: { label: "View all", href: "/build/my-work" } };

  return { action: { label: "All projects", href: "/build" } };
}

export function mapAllWorkTicketToMyWorkItem(ticket: {
  id: number;
  projectId: number | null;
  projectName: string | null;
  projectKey: string | null;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  dueDate: string | null;
}): MyWorkItem {
  return {
    id: ticket.id,
    projectId: ticket.projectId ?? 0,
    projectName: ticket.projectName ?? "",
    projectKey: ticket.projectKey ?? "",
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    dueDate: ticket.dueDate,
  };
}
