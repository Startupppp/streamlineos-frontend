"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiPermissionDeniedProps {
  reason?: string;
  className?: string;
}

export function AiPermissionDenied({ reason, className }: AiPermissionDeniedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 py-4 px-3 text-center",
        className,
      )}
    >
      <Lock className="h-4 w-4 text-muted-foreground/60" aria-hidden />
      <p className="text-[12px] font-medium text-muted-foreground">
        You don&apos;t have access to this AI feature
      </p>
      {reason && (
        <p className="text-[11px] text-muted-foreground/70">{reason}</p>
      )}
    </div>
  );
}
