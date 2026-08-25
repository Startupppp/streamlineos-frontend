"use client";

import type { ReactNode, ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
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

export function RichHero({
  eyebrow,
  title,
  description,
  hideDescriptionOnMobile = false,
  actions,
  className,
  children,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  hideDescriptionOnMobile?: boolean;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const hasCopy = Boolean(eyebrow || title || description);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl border border-status-info-rule",
        "bg-gradient-to-br from-gradient-info-from via-blue-50 to-gradient-info-to",
        "",
        "text-foreground shadow-accent",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 15%, rgba(125,211,252,0.35), transparent 40%), radial-gradient(circle at 90% 0%, rgba(191,219,254,0.55), transparent 38%), radial-gradient(circle at 75% 95%, rgba(224,231,255,0.5), transparent 42%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full border border-status-info-rule"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 right-20 h-24 w-24 rounded-full border border-status-info-rule"
      />

      <div className="relative p-4 sm:p-5">
        {hasCopy || actions ? (
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            {hasCopy ? (
              <div className="min-w-0 max-w-2xl flex-1">
                {eyebrow ? (
                  <p className="mb-1.5 text-dense font-semibold uppercase tracking-[0.14em] text-status-info-ink">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <h2 className="text-balance text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl md:text-2xl">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p
                    className={cn(
                      "mt-1.5 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground",
                      hideDescriptionOnMobile && "hidden sm:block",
                    )}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            ) : null}
            {actions ? (
              <div className="flex min-w-0 w-full flex-wrap items-stretch gap-2 sm:items-center lg:w-auto lg:shrink-0 lg:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        ) : null}
        {children ? (
          <div
            className={cn(
              "relative min-w-0",
              (hasCopy || actions) && "mt-3 sm:mt-4",
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RichQuickAction({
  href,
  icon: Icon,
  label,
  description,
  tone = "blue",
}: {
  href: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  tone?: RichTone;
}) {
  const tones: Record<RichTone, string> = {
    blue: "from-gradient-info-wash-from to-gradient-info-wash-to text-status-info-ink group-hover:border-status-info-rule",
    emerald:
      "from-gradient-success-wash-from to-gradient-success-wash-to text-status-success-ink group-hover:border-status-success-rule",
    amber:
      "from-gradient-warning-wash-from to-gradient-warning-wash-to text-status-warning-ink group-hover:border-status-warning-rule",
    rose: "from-gradient-danger-wash-from to-gradient-danger-wash-to text-status-danger-ink group-hover:border-status-danger-rule",
    sky: "from-gradient-info-wash-from to-gradient-info-wash-to text-status-info-ink group-hover:border-status-info-rule",
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-w-0 items-start gap-2.5 rounded-2xl border border-border/70 bg-card p-3 sm:gap-3 sm:p-3.5 md:p-4",
        "shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-raised",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border border-transparent sm:h-10 sm:w-10",
          tones[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
        </div>
        {description && (
          <p className="mt-0.5 text-dense leading-snug text-muted-foreground line-clamp-2 sm:line-clamp-1 md:line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </Link>
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
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action &&
        (typeof action === "object" && action !== null && "href" in action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-status-info-ink hover:text-status-info-ink transition-colors self-start"
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
    sky: "bg-status-info-surface text-status-info-ink",
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
