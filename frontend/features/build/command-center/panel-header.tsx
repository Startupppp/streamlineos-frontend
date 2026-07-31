"use client";

import type { ReactNode } from "react";

interface PanelHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PanelHeader({ title, actions }: PanelHeaderProps) {
  return (
    <div className="flex shrink-0 min-w-0 items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
      <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-foreground">
        {title}
      </h2>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}
