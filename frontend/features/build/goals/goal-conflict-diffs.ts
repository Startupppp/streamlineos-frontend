import type { GoalDetail } from "@/hooks/api/goals";
import type { ProjectGoalFormValues } from "./goal-form-schema";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";

export function buildGoalConflictDiffs(
  goal: GoalDetail,
  values: ProjectGoalFormValues,
): TicketConflictFieldDiff[] {
  const comparisons: Array<{
    key: string;
    label: string;
    serverValue: string;
    pendingValue: string;
  }> = [
    {
      key: "title",
      label: "Title",
      serverValue: goal.title,
      pendingValue: values.title.trim(),
    },
    {
      key: "description",
      label: "Description",
      serverValue: goal.description ?? "",
      pendingValue: values.description.trim(),
    },
    {
      key: "level",
      label: "Level",
      serverValue: goal.level,
      pendingValue: values.level,
    },
    {
      key: "status",
      label: "Status",
      serverValue: goal.status,
      pendingValue: values.status,
    },
    {
      key: "startDate",
      label: "Start date",
      serverValue: goal.startDate ?? "",
      pendingValue: values.startDate ?? "",
    },
    {
      key: "dueDate",
      label: "Due date",
      serverValue: goal.dueDate ?? "",
      pendingValue: values.dueDate ?? "",
    },
  ];

  const diffs: TicketConflictFieldDiff[] = [];
  for (const { key, label, serverValue, pendingValue } of comparisons) {
    if (serverValue !== pendingValue) {
      diffs.push({
        key,
        label,
        serverValue: serverValue || "Not set",
        pendingValue: pendingValue || "Not set",
      });
    }
  }
  return diffs.length > 0
    ? diffs
    : [
        {
          key: "version",
          label: "Version",
          serverValue: "changed",
          pendingValue: "stale",
        },
      ];
}
