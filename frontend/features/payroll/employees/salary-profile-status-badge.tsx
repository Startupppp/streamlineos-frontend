import { cn } from "@/lib/utils";
import type { SalaryProfileStatus } from "@/types/payroll/runs";

const STATUS_CONFIG: Record<SalaryProfileStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-status-success-surface text-status-success-ink border-status-success-rule", label: "Active" },
  UPCOMING: { className: "bg-primary/10 text-foreground border-primary/20", label: "Upcoming" },
  SUPERSEDED: { className: "bg-muted text-muted-foreground border-border", label: "Superseded" },
};

export function SalaryProfileStatusBadge({ status }: { status: SalaryProfileStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}
