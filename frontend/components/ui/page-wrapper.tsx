"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PAGE_CHROME_BOTTOM,
  PAGE_CHROME_MOBILE_NAV_PAD,
  PAGE_CHROME_X,
} from "@/components/ui/content-fill-panel";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";

interface PageWrapperProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  /** Labeled Back link on the left of the title. */
  backHref?: string;
  /** Labeled Back button on the left (click handler). Ignored when `leading` is set. */
  onBack?: () => void;
  /** Accessible label for `backHref` / `onBack`. Defaults to "Back". */
  backLabel?: string;
  /** Custom left control; takes precedence over `backHref` / `onBack`. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  filtersClassName?: string;
  actionsInline?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noInternalScroll?: boolean;
  variant?: "default" | "display";
  state?: PageStateResolution;
  loading?: React.ReactNode;
  empty?: React.ReactNode;
  onRetry?: () => void;
}

const backButtonClassName = "-ml-2 size-9 shrink-0 sm:size-8";

export function PageWrapper({
  title,
  subtitle,
  badge,
  backHref,
  onBack,
  backLabel = "Back",
  leading,
  actions,
  filters,
  filtersClassName,
  actionsInline = false,
  children,
  className,
  contentClassName,
  noInternalScroll = false,
  variant = "default",
  state,
  loading,
  empty,
  onRetry,
}: PageWrapperProps) {
  const headingId = React.useId();
  const isInterrupted = state !== undefined && state.kind !== "ready" && state.kind !== "empty";
  const visibleActions = isInterrupted ? undefined : actions;
  const visibleFilters = isInterrupted ? undefined : filters;
  const titleClass =
    variant === "display"
      ? "font-display text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold tracking-[-0.02em] text-foreground leading-tight"
      : "text-base sm:text-lg font-semibold tracking-tight text-foreground leading-tight";

  const builtInBack =
    !leading &&
    (onBack ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={backButtonClassName}
        onClick={onBack}
        aria-label={backLabel}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    ) : backHref ? (
      <Button
        variant="ghost"
        size="icon-sm"
        className={backButtonClassName}
        asChild
      >
        <Link href={backHref} aria-label={backLabel}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
    ) : null);

  const showHeader =
    title != null ||
    subtitle != null ||
    badge != null ||
    backHref != null ||
    onBack != null ||
    leading != null ||
    visibleActions != null ||
    builtInBack != null;

  const body =
    state === undefined ? (
      children
    ) : (
      <PageState
        resolution={state}
        loading={loading ?? <LoadingState variant="page" />}
        empty={empty}
        onRetry={onRetry}
        className="flex-1"
      >
        {children}
      </PageState>
    );

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden", className)}>
      {showHeader ? (
        <div
          className={cn(
            "shrink-0",
            PAGE_CHROME_X,
            actionsInline ? "pt-3.5 pb-2" : "pt-2 pb-3 sm:pt-3 sm:pb-3",
          )}
        >
          <div
            className={cn(
              actionsInline
                ? "flex flex-row items-center justify-between gap-2 sm:gap-3"
                : "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3",
            )}
          >
            <div
              className={cn(
                "min-w-0 flex-1 flex gap-1",
                actionsInline ? "items-center" : "items-start",
              )}
            >
              {leading ?? builtInBack}
              <div className="min-w-0 flex-1">
                {(title != null || badge) && (
                  <div className="flex min-w-0 items-center gap-2 flex-wrap">
                    {typeof title === "string" ? (
                      <h1
                        suppressHydrationWarning
                        id={headingId}
                        className={cn(titleClass, "min-w-0 max-w-2xl")}
                      >
                        <TruncatedText text={title} />
                      </h1>
                    ) : title != null ? (
                      <h1
                        suppressHydrationWarning
                        id={headingId}
                        className={cn(titleClass, "w-fit shrink-0")}
                      >
                        {title}
                      </h1>
                    ) : null}
                    {badge && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-foreground text-dense font-medium tabular-nums border border-primary/20">
                        {badge}
                      </span>
                    )}
                  </div>
                )}
                {subtitle && typeof subtitle === "string" ? (
                  <p className="mt-1 text-label text-muted-foreground leading-snug max-w-2xl">
                    {subtitle}
                  </p>
                ) : subtitle ? (
                  <div className="mt-1 text-label text-muted-foreground leading-snug max-w-2xl">
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>

            {visibleActions && (
              <div
                className={cn(
                  actionsInline
                    ? "flex shrink-0 items-center gap-2"
                    : "flex w-full flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
                )}
              >
                {visibleActions}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {visibleFilters && (
        <div
          className={cn(
            // Match FILTER_TOOLBAR_ROW: grow search only, never crush selects into overlaps.
            "shrink-0 w-full min-w-0 flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x pb-3 sm:gap-2.5",
            "[&>[data-slot=search-input]]:min-w-[12rem] [&>[data-slot=search-input]]:flex-1 [&>[data-slot=search-input]]:basis-[12rem]",
            "[&>[data-slot=select-trigger]]:shrink-0 [&>*:not([data-slot=search-input])]:shrink-0",
            PAGE_CHROME_X,
            filtersClassName,
          )}
        >
          {visibleFilters}
        </div>
      )}

      {noInternalScroll ? (
        <div
          className={cn(
            "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
            PAGE_CHROME_X,
            PAGE_CHROME_BOTTOM,
            PAGE_CHROME_MOBILE_NAV_PAD,
            contentClassName,
          )}
        >
          {body}
        </div>
      ) : (
        <div
          role="region"
          aria-labelledby={title != null ? headingId : undefined}
          aria-label={title == null ? "Page content" : undefined}
          tabIndex={0}
          className="h-full min-h-0 flex-1 overflow-y-auto scrollbar-hide outline-none"
        >
          <div
            className={cn(
              "flex min-h-full w-full flex-col overscroll-contain",
              PAGE_CHROME_X,
              PAGE_CHROME_BOTTOM,
              PAGE_CHROME_MOBILE_NAV_PAD,
              contentClassName,
            )}
          >
            {body}
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
