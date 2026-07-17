"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useExitChecklist, type ExitChecklistItem } from "@/hooks/api/hr/exit";

interface ExitChecklistSectionProps {
  resignationId: number;
}

function ChecklistItemRow({ item }: { item: ExitChecklistItem }) {
  const isCompleted = item.status === "COMPLETED" || item.status === "completed";
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          isCompleted
            ? "bg-emerald-500"
            : "bg-amber-400",
        )}
      />
      <TruncatedText
        text={item.item ?? ""}
        lines={2}
        className={cn("text-sm flex-1 min-w-0", isCompleted && "line-through text-muted-foreground")}
      />
      <span
        className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
          isCompleted
            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        )}
      >
        {isCompleted ? "Done" : "Pending"}
      </span>
    </div>
  );
}

export function ExitChecklistSection({ resignationId }: ExitChecklistSectionProps) {
  const { data, isLoading } = useExitChecklist(resignationId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-md" />
        ))}
      </div>
    );
  }

  const items = data ?? [];
  const completed = items.filter(
    (i) => i.status === "COMPLETED" || i.status === "completed",
  ).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Checklist Progress</span>
          <span>{completed} / {total} completed</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-[400ms] ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground text-right">{percent}%</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No checklist items found.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
