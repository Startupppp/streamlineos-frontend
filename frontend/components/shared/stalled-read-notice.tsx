"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StalledReadNoticeProps {
  className?: string;
  subject: string;
  onRetry: () => void;
}

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
