"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_CHROME_BOTTOM, PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { TruncatedText } from "@/components/ui/truncated-text";

interface PageWrapperProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  backHref?: string;
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

  return (
    <div className={cn("flex flex-col flex-1 min-h-0 min-w-0 overflow-x-hidden", className)}>
      <div
        className={cn(
          "shrink-0",
          PAGE_CHROME_X,
          actionsInline ? "pt-3.5 pb-2" : "pt-4 pb-3 sm:pt-6 sm:pb-3",
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
            {leading}
            {!leading && backHref && (
              <Button variant="ghost" size="icon" className="w-8 shrink-0 mt-0.5" aria-label="Back" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 flex-wrap">
                {typeof title === "string" ? (
                  <h1 className={cn(titleClass, "min-w-0 max-w-2xl")}>
                    <TruncatedText text={title} />
                  </h1>
                ) : (
                  <h1 className={cn(titleClass, "w-fit shrink-0")}>{title}</h1>
                )}
                {badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-foreground text-[11px] font-medium tabular-nums border border-primary/20">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && typeof subtitle === "string" ? (
                <TruncatedText
                  text={subtitle}
                  className="mt-1 text-[13px] text-muted-foreground leading-snug max-w-2xl"
                />
              ) : subtitle ? (
                <div className="mt-1 text-[13px] text-muted-foreground leading-snug max-w-2xl">
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>

          {actions && (
            <div
              className={cn(
                actionsInline
                  ? "flex shrink-0 items-center gap-2"
                  : "flex w-full flex-col items-stretch gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto",
              )}
            >
              {actions}
            </div>
          )}
        </div>
      </div>

      {filters && (
        <div
          className={cn(
            "shrink-0 w-full min-w-0 flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x pb-3 sm:gap-2.5 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1 sm:[&>*:first-child]:flex-none",
            PAGE_CHROME_X,
            filtersClassName,
          )}
        >
          {filters}
        </div>
      )}

      {noInternalScroll ? (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            PAGE_CHROME_X,
            PAGE_CHROME_BOTTOM,
            contentClassName,
          )}
        >
          {children}
        </div>
      ) : (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto scrollbar-hide",
            contentClassName,
          )}
        >
          <div
            className={cn(
              "flex min-h-full w-full flex-col overscroll-contain",
              PAGE_CHROME_X,
              PAGE_CHROME_BOTTOM,
            )}
          >
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
