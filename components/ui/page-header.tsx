"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Lightweight page header for pages that do NOT use PageWrapper.
 * For new pages, prefer PageWrapper which has built-in filters support.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-5",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium tabular-nums border border-border/60">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground leading-snug">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0 flex-wrap justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
