"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  title: string;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noInternalScroll?: boolean;
  variant?: "default" | "display";
}

export function PageWrapper({
  title,
  subtitle,
  eyebrow,
  badge,
  actions,
  filters,
  children,
  className,
  contentClassName,
  noInternalScroll = false,
  variant = "default",
}: PageWrapperProps) {
  const titleClass =
    variant === "display"
      ? "font-display text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold tracking-[-0.02em] text-slate-900 leading-tight"
      : "text-base sm:text-lg font-semibold tracking-tight text-slate-900 leading-tight";

  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-blue-600 mb-1 leading-none">
                {eyebrow}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={titleClass}>
                {title}
              </h1>
              {badge && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium tabular-nums border border-blue-200/70">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-[13px] text-slate-600 leading-snug max-w-2xl">
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
        <div className="shrink-0 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm">
          <div className="px-3 sm:px-4 py-2 flex items-center gap-3 overflow-x-auto scrollbar-thin">
            {filters}
          </div>
        </div>
      )}

      {!filters && <div className="shrink-0 mx-4 sm:mx-6 h-px bg-slate-200/70" />}

      {noInternalScroll ? (
        <div className={cn("flex-1 min-h-0 overflow-hidden px-4 sm:px-6 pt-3 pb-4", contentClassName)}>
          {children}
        </div>
      ) : (
        <div className={cn("flex-1 min-h-0 overflow-y-auto scrollbar-thin", contentClassName)}>
          <div className="px-4 sm:px-6 pt-3 pb-6">
            {children}
          </div>
        </div>
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
