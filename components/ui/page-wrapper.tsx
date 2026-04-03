"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  /** Page title shown in the header bar */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Optional badge next to title — e.g. record count */
  badge?: React.ReactNode;
  /** Right-side action buttons */
  actions?: React.ReactNode;
  /**
   * Sticky filter bar rendered below the title row.
   * Sticks to the top while the content scrolls.
   */
  filters?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  className?: string;
  /** Extra class for the scrollable content area */
  contentClassName?: string;
  /**
   * If true the content area handles its own scroll internally.
   * Use for pages where YOU manage the scroll container (e.g. kanban).
   * Default: false — DashboardShell's outer ScrollArea handles scroll.
   */
  noInternalScroll?: boolean;
}

/**
 * PageWrapper — the single, consistent page layout used across every dashboard
 * page.
 *
 * Structure
 * ─────────
 * ┌──────────────────────────────────────┐
 * │ title  [badge]        [actions]      │  ← not scrollable
 * │ subtitle                             │
 * ├──────────────────────────────────────┤
 * │ [filters bar — sticky]               │  ← sticks on scroll
 * ├──────────────────────────────────────┤
 * │                                      │
 * │     children (scrolled by parent)    │
 * │                                      │
 * └──────────────────────────────────────┘
 */
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
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* ── Header ── */}
      <div className="px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
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
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
                {subtitle}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters bar ── */}
      {filters && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/60">
          <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
            {filters}
          </div>
        </div>
      )}

      {/* ── Divider (when no filters) ── */}
      {!filters && (
        <div className="mx-4 sm:mx-6 h-px bg-border/60" />
      )}

      {/* ── Content ── */}
      <div
        className={cn(
          "px-4 sm:px-6 py-5",
          noInternalScroll && "flex-1 min-h-0 overflow-hidden",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * PageSection — a visual section divider within a PageWrapper.
 * Use to group related content blocks.
 */
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
