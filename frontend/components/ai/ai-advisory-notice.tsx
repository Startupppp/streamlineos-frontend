import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiAdvisoryNotice({
  advisory,
  className,
}: {
  advisory: string;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-2.5 py-2 text-dense text-status-warning-ink",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{advisory}</span>
    </p>
  );
}
