"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noInternalScroll?: boolean;
}

export function PageWrapper({
  title,
  subtitle,
  badge,
  actions,
  filters,
  children,
  className,
  contentClassName,
  noInternalScroll = false,
}: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
                {title}
              </h1>
              {badge && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium tabular-nums border border-border/60">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {filters && (
        <div className="shrink-0 border-b border-border/60 bg-background">
          <div className="px-3 sm:px-4 py-2 flex items-center gap-3 overflow-x-auto scrollbar-thin">
            {filters}
          </div>
        </div>
      )}

      {!filters && <div className="shrink-0 mx-4 sm:mx-6 h-px bg-border/60" />}

      {noInternalScroll ? (
        <div className={cn("flex-1 min-h-0 overflow-hidden px-4 sm:px-6 pt-3 pb-4", contentClassName)}>
          {children}
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className={cn("px-4 sm:px-6 pt-3 pb-6 overflow-x-hidden", contentClassName)}>
            {children}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
