"use client";

import type { ComponentType, ReactNode } from "react";

export function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs text-foreground text-right min-w-0 truncate">
          {value ?? "—"}
        </span>
      </div>
    </div>
  );
}
