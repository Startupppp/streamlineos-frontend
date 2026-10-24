"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RichTone = "blue" | "emerald" | "amber" | "rose" | "sky";
export type RichWellTone = RichTone | "slate";

export function RichPanel({
  children,
  className,
  padded = true,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm",
        "shadow-card",
        padded && "p-4 sm:p-5",
        hover &&
          "transition-all duration-300 hover:shadow-accent hover:border-status-info-rule hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RichSectionHeader({
  title,
  description,
  action,
  className,
  size = "sm",
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string } | ReactNode;
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-2.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "lg" ? "text-base" : "text-sm",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-dense leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action &&
        (typeof action === "object" && action !== null && "href" in action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-dense font-medium text-status-info-ink transition-colors hover:text-status-info-ink self-start"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <div className="shrink-0 self-start">{action}</div>
        ))}
    </div>
  );
}

export function RichIconWell({
  children,
  tone = "blue",
  className,
  size = "md",
}: {
  children: ReactNode;
  tone?: RichWellTone;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tones: Record<RichWellTone, string> = {
    blue: "bg-status-info-surface text-status-info-ink",
    emerald: "bg-status-success-surface text-status-success-ink",
    amber: "bg-status-warning-surface text-status-warning-ink",
    rose: "bg-status-danger-surface text-status-danger-ink",
    slate: "bg-muted text-muted-foreground",
    sky: "bg-category-sky-surface text-category-sky-ink",
  };

  const sizes = {
    sm: "h-7 w-7 rounded-lg",
    md: "h-8 w-8 rounded-lg",
    lg: "h-10 w-10 rounded-xl",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RichPageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 sm:gap-4 overflow-x-hidden [&>*]:shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
