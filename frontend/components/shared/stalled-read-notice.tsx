"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StalledReadNoticeProps {
  className?: string;
  /** What is not arriving, in the reader's words: "conversations", "invitations". */
  subject: string;
  onRetry: () => void;
}

/**
 * The panel-sized counterpart to `AppLoadingStalled`.
 *
 * That component answers the same question for the whole shell and reloads the
 * page to do it; a list panel owns a `refetch`, so it asks for one rather than
 * discarding everything else on screen. The notice sits WITH the skeleton rather
 * than replacing it: the read has not failed, it is late, and swapping in an error
 * would claim more than is known.
 */
export function StalledReadNotice({
  className,
  subject,
  onRetry,
}: StalledReadNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-dense text-muted-foreground">
          Still loading {subject}. The server is taking longer than usual to
          answer.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
