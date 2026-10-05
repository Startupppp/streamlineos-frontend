import { cn } from "@/lib/utils";
import type { StatFilter } from "./workload-types";
import type { WorkloadStat } from "./workload-view-model";

interface StatButtonProps {
  stat: WorkloadStat;
  value: number;
  isActive: boolean;
  onToggle: (id: StatFilter) => void;
}

export function StatButton({ stat, value, isActive, onToggle }: StatButtonProps) {
  function handleClick() {
    onToggle(stat.id);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "bg-card rounded-lg border border-border p-3 flex h-full items-center gap-3 shadow-sm text-left transition-colors hover:bg-muted/40",
        isActive && stat.id !== "all" && "ring-2 ring-primary/30 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
          stat.bg,
        )}
      >
        <stat.icon className={cn("h-4 w-4", stat.text)} />
      </div>
      <div>
        <p className="text-lg font-medium text-foreground tabular-nums">
          {value}
        </p>
        <p className="text-dense text-muted-foreground">{stat.label}</p>
      </div>
    </button>
  );
}
