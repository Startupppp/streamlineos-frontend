"use client";

import type { ReactNode, ComponentType } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Soft elevated panel used across HR list/detail surfaces */
export function HrPanel({
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
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]",
        padded && "p-4 sm:p-5",
        hover &&
          "transition-all duration-300 hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.18)] hover:border-blue-500/20 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Soft light hero band for HR page headers / hub intros */
export function HrHero({
  eyebrow,
  title,
  description,
  hideDescriptionOnMobile = false,
  actions,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  hideDescriptionOnMobile?: boolean;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl border border-blue-200/60 dark:border-blue-500/20",
        "bg-gradient-to-br from-sky-50 via-blue-50 to-blue-100/80",
        "dark:from-slate-900/40 dark:via-blue-950/30 dark:to-blue-950/20",
        "text-foreground shadow-[0_8px_28px_-18px_rgba(59,130,246,0.22)]",
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
        className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full border border-blue-200/50 dark:border-blue-400/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 right-20 h-24 w-24 rounded-full border border-sky-200/40 dark:border-sky-400/10"
      />

      <div className="relative p-4 sm:p-5 md:p-6 lg:p-7">
        {/*
          Stack header until lg: with the app sidebar, sm/md widths (~700–900px
          content) are too tight for title + actions side-by-side.
        */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0 max-w-2xl flex-1">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600/80 dark:text-blue-300/80 mb-1.5">
                {eyebrow}
              </p>
            )}
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-balance leading-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  "mt-1.5 text-sm text-muted-foreground leading-relaxed text-pretty max-w-prose",
                  hideDescriptionOnMobile && "hidden sm:block",
                )}
              >
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex min-w-0 w-full flex-wrap items-stretch gap-2 sm:items-center lg:w-auto lg:shrink-0 lg:justify-end">
              {actions}
            </div>
          )}
        </div>
        {children && <div className="relative mt-4 sm:mt-5 min-w-0">{children}</div>}
      </div>
    </div>
  );
}

/** Quick-action tile used in HR hub shortcuts */
export function HrQuickAction({
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
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "sky";
}) {
  const tones = {
    blue: "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-300 group-hover:border-blue-500/30",
    emerald:
      "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-300 group-hover:border-emerald-500/30",
    amber:
      "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-300 group-hover:border-amber-500/30",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-300 group-hover:border-rose-500/30",
    violet:
      "from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-300 group-hover:border-blue-500/30",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-300 group-hover:border-sky-500/30",
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-w-0 items-start gap-2.5 rounded-2xl border border-border/70 bg-card p-3 sm:gap-3 sm:p-3.5 md:p-4",
        "shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.25)]",
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
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2 sm:line-clamp-1 md:line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Section header with optional action link */
export function HrSectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string } | ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action &&
        (typeof action === "object" && action !== null && "href" in action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 transition-colors self-start"
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


const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; border: string }
> = {
  active: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200/80 dark:border-emerald-800/50",
  },
  inactive: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/40",
    border: "border-border",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-amber-200/80 dark:border-amber-800/50",
  },
  approved: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200/80 dark:border-emerald-800/50",
  },
  rejected: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    border: "border-rose-200/80 dark:border-rose-800/50",
  },
  default: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    border: "border-blue-200/80 dark:border-blue-800/50",
  },
};

export function HrStatusBadge({
  status,
  label,
  className,
}: {
  status: "active" | "inactive" | "pending" | "approved" | "rejected" | "default" | string;
  label?: string;
  className?: string;
}) {
  const key = status.toLowerCase() as keyof typeof STATUS_STYLES;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.default;
  const text = label ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
      {text}
    </span>
  );
}

/** Soft icon well for list rows and widgets */
export function HrIconWell({
  children,
  tone = "blue",
  className,
  size = "md",
}: {
  children: ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "slate" | "sky";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    violet: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    slate: "bg-muted text-muted-foreground",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
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

/** Page content container — natural height so PageWrapper ScrollArea can scroll */
export function HrPageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 sm:gap-5 overflow-x-hidden [&>*]:shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Empty / error recovery card */
export function HrEmptyPanel({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border/80",
        "bg-muted/20 px-6 py-12",
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
