import { cn } from "@/lib/utils";

export interface ExitTimelineStep {
  label: string;
  status: "completed" | "active" | "pending" | "rejected";
  actor?: string | null;
  timestamp?: string | null;
  remarks?: string | null;
}

interface ExitTimelineProps {
  steps: readonly ExitTimelineStep[];
  className?: string;
}

const DOT_CLASS: Record<ExitTimelineStep["status"], string> = {
  completed: "bg-status-success-fill border-status-success-rule",
  active: "bg-background border-primary ring-2 ring-primary/30",
  pending: "bg-background border-input",
  rejected: "bg-status-danger-fill border-status-danger-rule",
};

const LABEL_CLASS: Record<ExitTimelineStep["status"], string> = {
  completed: "text-status-success-ink font-medium",
  active: "text-foreground font-semibold",
  pending: "text-muted-foreground",
  rejected: "text-status-danger-ink font-medium",
};

export function ExitTimeline({ steps, className }: ExitTimelineProps) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-start gap-3">
          <div className="flex shrink-0 flex-col items-center">
            <div className={cn("h-4 w-4 shrink-0 rounded-full border-2 transition-colors", DOT_CLASS[step.status])} />
            {index < steps.length - 1 ? (
              <div className={cn("mt-0.5 h-5 w-0.5", step.status === "completed" ? "bg-status-success-fill" : "bg-border")} />
            ) : null}
          </div>
          <div className="-mt-0.5 min-w-0 pb-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-dense leading-tight", LABEL_CLASS[step.status])}>{step.label}</span>
              {step.timestamp ? (
                <span className="shrink-0 text-micro tabular-nums text-muted-foreground">{step.timestamp}</span>
              ) : null}
            </div>
            {step.actor ? <p className="text-micro text-muted-foreground">{step.actor}</p> : null}
            {step.remarks ? <p className="text-micro text-muted-foreground">{step.remarks}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
