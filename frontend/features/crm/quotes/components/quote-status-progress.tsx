import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/types/crm/quotes";
import { STATUS_LABELS } from "../lib/quote-utils";

const STATUS_ORDER: QuoteStatus[] = ["DRAFT", "SENT", "ACCEPTED"];

interface QuoteStatusProgressProps {
  status: QuoteStatus;
}

export function QuoteStatusProgress({ status }: QuoteStatusProgressProps) {
  if (status === "REJECTED" || status === "EXPIRED") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
          Draft
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
          Sent
        </div>
        <div className="flex-1 h-px bg-border" />
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            status === "REJECTED" ? "text-status-danger-ink" : "text-status-warning-ink",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full inline-block",
              status === "REJECTED" ? "bg-status-danger-fill" : "bg-status-warning-fill",
            )}
          />
          {STATUS_LABELS[status]}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {STATUS_ORDER.map((s, idx) => {
        const currentIdx = STATUS_ORDER.indexOf(status);
        const isPast = idx < currentIdx;
        const isCurrent = s === status;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs",
                isCurrent
                  ? "font-semibold text-foreground"
                  : isPast
                    ? "text-status-success-ink"
                    : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full inline-block",
                  isCurrent
                    ? "bg-primary"
                    : isPast
                      ? "bg-status-success-fill"
                      : "bg-muted-foreground/30",
                )}
              />
              {STATUS_LABELS[s]}
            </div>
            {idx < STATUS_ORDER.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px mx-1",
                  isPast ? "bg-status-success-fill" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
