import { getCompletedStatusNames } from "@/features/build/shared/completed-status";
import type { ProjectStatusRecord, Ticket } from "@/types/projects";

export function formatStatusName(name: string): string {
  const words = name.toLowerCase().split(/[_\s]+/).filter(Boolean);
  const first = words[0];
  if (!first) return name;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(" ");
}

export function computeEpicRollup(
  children: Ticket[],
  projectStatuses: ProjectStatusRecord[] | undefined,
): {
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  todoItems: number;
  totalPoints: number;
  completedPoints: number;
} {
  const completedNames = getCompletedStatusNames(projectStatuses);
  const hasConfiguredStatuses = projectStatuses != null && projectStatuses.length > 0;
  const startedNames: Set<string> = hasConfiguredStatuses
    ? new Set(projectStatuses.filter((s) => s.type === "started").map((s) => s.name))
    : new Set(["IN_PROGRESS", "IN_REVIEW"]);

  let done = 0, inProgress = 0, totalPts = 0, completedPts = 0;
  for (const child of children) {
    const pts = child.points ?? 0;
    totalPts += pts;
    if (completedNames.has(child.status)) {
      done++;
      completedPts += pts;
    } else if (startedNames.has(child.status)) {
      inProgress++;
    }
  }
  return {
    totalItems: children.length,
    completedItems: done,
    inProgressItems: inProgress,
    todoItems: children.length - done - inProgress,
    totalPoints: totalPts,
    completedPoints: completedPts,
  };
}
