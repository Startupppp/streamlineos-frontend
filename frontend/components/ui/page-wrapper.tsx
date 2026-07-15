"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PageWrapperProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  backHref?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  filtersClassName?: string;
  filtersCollapseBreakpoint?: "sm" | "md";
  mobileFiltersInline?: boolean;
  actionsInline?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noInternalScroll?: boolean;
  variant?: "default" | "display";
}

export function PageWrapper({
  title,
  subtitle,
  badge,
  backHref,
  leading,
  actions,
  filters,
  filtersClassName,
  filtersCollapseBreakpoint = "sm",
  mobileFiltersInline = false,
  actionsInline = false,
  children,
  className,
  contentClassName,
  noInternalScroll = false,
  variant = "default",
}: PageWrapperProps) {
  const titleClass =
    variant === "display"
      ? "font-display text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold tracking-[-0.02em] text-foreground leading-tight"
      : "text-base sm:text-lg font-semibold tracking-tight text-foreground leading-tight";

  const mobileFiltersClass =
    filtersCollapseBreakpoint === "md" ? "flex md:hidden" : "flex sm:hidden";
  const desktopFiltersClass =
    filtersCollapseBreakpoint === "md" ? "hidden md:flex" : "hidden sm:flex";

  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      <div
        className={cn(
          "shrink-0 px-4 sm:px-6",
          actionsInline ? "pt-3 pb-1.5" : "pt-4 pb-2",
        )}
      >
        <div
          className={cn(
            actionsInline
              ? "flex flex-row items-center justify-between gap-2 sm:gap-3"
              : "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
          )}
        >
          <div
            className={cn(
              "min-w-0 flex-1 flex gap-1",
              actionsInline ? "items-center" : "items-start",
            )}
          >
            {leading}
            {!leading && backHref && (
              <Button variant="ghost" size="icon" className="w-8 shrink-0 mt-0.5" aria-label="Back" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={titleClass}>
                  {title}
                </h1>
                {badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-foreground text-[11px] font-medium tabular-nums border border-primary/20">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-1 text-[13px] text-muted-foreground leading-snug max-w-2xl line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div
              className={cn(
                actionsInline
                  ? "flex shrink-0 items-center gap-2"
                  : "grid w-full auto-cols-fr grid-flow-col gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center",
              )}
            >
              {actions}
            </div>
          )}
        </div>
      </div>

      {filters && (
        <div className="shrink-0">
          {!mobileFiltersInline && (
            <div className={cn("px-4 sm:px-6 pb-2", mobileFiltersClass, filtersClassName)}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="text-xs gap-1.5">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-[85vw] p-3" align="start">
                  <div className="flex flex-col gap-2">
                    {filters}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div
            className={cn(
              "px-4 sm:px-6 pb-2 flex-wrap items-center gap-2 sm:gap-3",
              mobileFiltersInline ? "flex" : desktopFiltersClass,
              filtersClassName,
            )}
          >
            {filters}
          </div>
        </div>
      )}

      {noInternalScroll ? (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            contentClassName ?? "px-4 sm:px-6",
          )}
        >
          {children}
        </div>
      ) : (
        <ScrollArea
          fill
          hideScrollbar
          className={cn("flex-1 min-h-0", contentClassName)}
        >
          <div className="flex min-h-0 flex-1 flex-col px-4 sm:px-6 overscroll-contain">
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
