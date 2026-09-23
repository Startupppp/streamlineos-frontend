import type { ProjectListItem } from "@/types/projects/projects";
import type { ProjectActiveFilters } from "./add-filter-popover";
import type {
  ProjectOrderBy,
  ProjectSortDir,
} from "./use-display-prefs";

function assertNever(value: never): never {
  throw new Error(`Unhandled project order-by: ${String(value)}`);
}

function compareProjectsByOrder(
  a: ProjectListItem,
  b: ProjectListItem,
  orderBy: ProjectOrderBy,
): number {
  switch (orderBy) {
    case "name":
      return a.name.localeCompare(b.name);
    case "status":
      return (a.status ?? "").localeCompare(b.status ?? "");
    case "targetDate": {
      const aT = a.endDate ? new Date(a.endDate).getTime() : Infinity;
      const bT = b.endDate ? new Date(b.endDate).getTime() : Infinity;
      return aT - bT;
    }
    case "progress":
      return a.progress.percentage - b.progress.percentage;
    default:
      return assertNever(orderBy);
  }
}

export function sortProjects(
  projects: ProjectListItem[],
  orderBy: ProjectOrderBy,
  orderDir: ProjectSortDir,
): ProjectListItem[] {
  return [...projects].sort((a, b) => {
    const cmp = compareProjectsByOrder(a, b, orderBy);
    return orderDir === "asc" ? cmp : -cmp;
  });
}

export function groupProjects(
  projects: ProjectListItem[],
  activeGroup: string | null,
): ProjectListItem[] {
  if (!activeGroup) return projects;
  const [type, value] = activeGroup.split(":");
  if (type === "status") {
    return projects.filter((p) => (p.status ?? "ACTIVE") === value);
  }
  if (type === "lead") {
    return projects.filter((p) => p.manager?.id === value);
  }
  if (type === "member") {
    return projects.filter((p) => p.members.some((m) => m.id === value));
  }
  return projects;
}

export function filterVisibleProjects(
  projects: ProjectListItem[],
  activeFilters: ProjectActiveFilters,
  showClosed: boolean,
): ProjectListItem[] {
  let result = projects;
  if (activeFilters.status) {
    result = result.filter((p) => p.status === activeFilters.status);
  }
  if (activeFilters.health) {
    result = result.filter((p) => p.health === activeFilters.health);
  }
  if (!showClosed) {
    result = result.filter(
      (p) => p.status !== "ARCHIVED" && p.status !== "COMPLETED",
    );
  }
  return result;
}
