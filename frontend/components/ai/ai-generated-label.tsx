"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AiGeneratedLabelProps {
  timestamp?: string | Date;
  className?: string;
}

export function AiGeneratedLabel({ timestamp, className }: AiGeneratedLabelProps) {
  const relativeTime = React.useMemo(() => {
    if (!timestamp) return null;
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  }, [timestamp]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-micro font-medium text-muted-foreground",
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0" aria-hidden />
      {relativeTime ? `Generated ${relativeTime}` : "AI-generated"}
    </span>
  );
}
