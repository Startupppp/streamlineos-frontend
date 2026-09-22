"use client";

import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePermissionGate } from "@/hooks/api/access";
import { useSettingsHistory } from "@/hooks/api/timesheets-core/settings-history";
import type { SettingsHistoryEntry } from "@/features/timesheets/types";

function diffAgainst(
  entry: SettingsHistoryEntry,
  previous: SettingsHistoryEntry | undefined,
): { field: string; from: unknown; to: unknown }[] {
  if (!previous) return [];
  const changed: { field: string; from: unknown; to: unknown }[] = [];
  for (const [field, to] of Object.entries(entry.settings)) {
    const from = previous.settings[field];
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    if (field === "id" || field === "orgId" || field === "updatedAt" || field === "createdAt")
      continue;
    changed.push({ field, from, to });
  }
  return changed;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "not set";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "none";
  if (typeof value === "boolean") return value ? "on" : "off";
  return String(value);
}

export function SettingsHistoryTab() {
  const access = usePermissionGate("timesheets:settings:view");
  const { data, isLoading, isError, error, refetch } = useSettingsHistory();

  if (access.denied) {
    return (
      <EmptyState
        access={access}
        title="Access restricted"
        description="You don't have permission to view timesheet settings."
        compact
        className="min-h-[20dvh]"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load the settings history"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
        className="flex-1 min-h-[30dvh]"
      />
    );
  }

  const entries = data ?? [];
  if (entries.length === 0) {
    return (
      <EmptyState
        access={access}
        title="No settings changes recorded"
        description="Every change to these settings is snapshotted here with who made it and why."
        compact
        className="min-h-[20dvh]"
      />
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry, index) => {
        const changes = diffAgainst(entry, entries[index + 1]);
        const isOldest = index === entries.length - 1;
        return (
          <li
            key={entry.id}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-noir"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="tabular-nums">
                v{entry.version}
              </Badge>
              <span className="text-dense text-muted-foreground tabular-nums">
                {format(parseISO(entry.createdAt), "d MMM yyyy, HH:mm")}
              </span>
            </div>

            {entry.changeReason ? (
              <p className="mt-2 text-sm">{entry.changeReason}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground italic">
                No reason was recorded for this change.
              </p>
            )}

            {changes.length > 0 && (
              <dl className="mt-3 grid gap-1">
                {changes.map((change) => (
                  <div key={change.field} className="flex flex-wrap gap-x-2 text-dense">
                    <dt className="text-muted-foreground">{change.field}</dt>
                    <dd className="tabular-nums">
                      <span className="text-muted-foreground line-through">
                        {renderValue(change.from)}
                      </span>{" "}
                      → <span className="font-medium">{renderValue(change.to)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {isOldest && (
              <p className="mt-3 text-micro text-muted-foreground">
                The oldest version this list holds. Nothing is shown as changed
                because there is no earlier snapshot here to compare it against.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
