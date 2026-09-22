import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnonymitySuppressedNoticeProps {
  minResponses: number;
  responses?: number;
  className?: string;
}

export function anonymitySuppressedMessage(minResponses: number): string {
  return `Fewer than ${minResponses} responses — hidden to protect anonymity`;
}

export function AnonymitySuppressedNotice({ minResponses, responses, className }: AnonymitySuppressedNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{anonymitySuppressedMessage(minResponses)}</p>
        {responses !== undefined ? (
          <p className="tabular-nums">
            {responses} of {minResponses} responses so far
          </p>
        ) : null}
      </div>
    </div>
  );
}
