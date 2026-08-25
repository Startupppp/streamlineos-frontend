"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Module } from "@/types/projects/projects";
import type { ModuleStatus } from "@/types/projects/shared";
import { getModuleAvatarDisplay } from "@/features/build/modules/lib/module-name";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/lib/text-overflow";

interface ModuleStatusStyle {
  label: string;
  stripe: string;
  accentBar: string;
  badge: string;
  progressBar: string;
  avatar: string;
}

const MODULE_STATUS_STYLES: Record<ModuleStatus, ModuleStatusStyle> = {
  backlog: {
    label: "Backlog",
    stripe: "border-l-slate-400",
    accentBar: "from-gradient-neutral-from to-transparent",
    badge: "bg-muted text-muted-foreground border-border",
    progressBar: "from-gradient-neutral-from to-gradient-neutral-to",
    avatar: "bg-muted text-muted-foreground ring-border",
  },
  planned: {
    label: "Planned",
    stripe: "border-l-blue-400 dark:border-l-blue-500",
    accentBar: "from-gradient-info-from to-transparent",
    badge: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    progressBar: "from-gradient-info-from to-gradient-info-to",
    avatar: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  },
  "in-progress": {
    label: "In Progress",
    stripe: "border-l-blue-600 dark:border-l-blue-500",
    accentBar: "from-gradient-info-from via-blue-500/30 to-transparent",
    badge: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    progressBar: "from-gradient-info-from via-blue-500 to-gradient-info-to",
    avatar: "bg-status-info-surface text-status-info-ink ring-status-info-rule",
  },
  paused: {
    label: "Paused",
    stripe: "border-l-amber-500",
    accentBar: "from-gradient-warning-from to-transparent",
    badge: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    progressBar: "from-gradient-warning-from to-gradient-warning-to",
    avatar: "bg-status-warning-surface text-status-warning-ink ring-status-warning-rule",
  },
  completed: {
    label: "Completed",
    stripe: "border-l-emerald-500",
    accentBar: "from-gradient-success-from to-transparent",
    badge: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    progressBar: "from-gradient-success-from to-gradient-success-to",
    avatar: "bg-status-success-surface text-status-success-ink ring-status-success-rule",
  },
  cancelled: {
    label: "Cancelled",
    stripe: "border-l-red-500",
    accentBar: "from-gradient-danger-from to-transparent",
    badge: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
    progressBar: "from-gradient-danger-from to-gradient-danger-to",
    avatar: "bg-status-danger-surface text-status-danger-ink ring-status-danger-rule",
  },
};

function formatModuleDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-IN", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export interface ModuleCardProps {
  module: Module;
  projectId: number;
  index?: number;
}

export const ModuleCard = memo(function ModuleCard({
  module: mod,
  projectId,
  index = 0,
}: ModuleCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const progress = mod.progress ?? 0;
  const status = mod.status ?? "backlog";
  const style = MODULE_STATUS_STYLES[status] ?? MODULE_STATUS_STYLES.backlog;
  const avatarDisplay = useMemo(() => getModuleAvatarDisplay(mod.name), [mod.name]);
  const isEmojiAvatar = avatarDisplay.length <= 4 && /\p{Extended_Pictographic}/u.test(avatarDisplay);

  const entrance = prefersReducedMotion
    ? { opacity: 1, y: 0 }
    : { opacity: 0, y: 12 };
  const animate = { opacity: 1, y: 0 };
  const hover = prefersReducedMotion ? undefined : { y: -3 };

  return (
    <motion.div
      initial={entrance}
      animate={animate}
      whileHover={hover}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.22,
        ease: "easeOut",
        delay: prefersReducedMotion ? 0 : index * 0.06,
      }}
      className="h-full"
    >
      <Link
        href={`/build/${projectId}?module=${mod.id}`}
        className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      >
        <article
          className={cn(
            PM_PANEL,
            "relative flex h-full flex-col border-l-[3px]",
            "transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
            "group-hover:border-primary/40 group-hover:shadow-md",
            style.stripe,
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
              style.accentBar,
            )}
            aria-hidden="true"
          />

          <div className="flex flex-1 flex-col p-3.5">
            <div className="mb-3 flex items-start gap-2.5">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                  isEmojiAvatar ? "text-xl leading-none" : "text-dense font-bold tracking-tight",
                  style.avatar,
                )}
                aria-hidden="true"
              >
                {avatarDisplay}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={cn(TEXT_TWO_LINES, "text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary")}>
                    {mod.name}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-micro font-semibold",
                      style.badge,
                    )}
                  >
                    {style.label}
                  </span>
                </div>

                {mod.description ? (
                  <p className={cn(TEXT_ONE_LINE, "mt-1 text-dense text-muted-foreground")}>
                    {mod.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-dense font-medium tabular-nums text-muted-foreground">
                  <span className="text-foreground">{progress}%</span> complete
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${mod.name} progress`}
                aria-valuetext={`${progress}% complete`}
              >
                <motion.div
                  className={cn("h-full rounded-full bg-gradient-to-r", style.progressBar)}
                  initial={{ width: prefersReducedMotion ? `${progress}%` : "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.5,
                    ease: "easeOut",
                    delay: prefersReducedMotion ? 0 : index * 0.06 + 0.15,
                  }}
                />
              </div>

              {(mod.startDate || mod.endDate) ? (
                <p className="flex min-w-0 items-center gap-1.5 text-dense text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                  <span className="min-w-0 truncate">
                    {formatModuleDate(mod.startDate)} — {formatModuleDate(mod.endDate)}
                  </span>
                </p>
              ) : null}

              {mod.leadId ? (
                <p className="flex items-center gap-1.5 text-dense text-muted-foreground">
                  <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                  <span className="truncate">Lead assigned</span>
                </p>
              ) : null}
            </div>
          </div>

          {status === "in-progress" ? (
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/[0.04] blur-xl"
              aria-hidden="true"
            />
          ) : null}
        </article>
      </Link>
    </motion.div>
  );
});

export function ModuleCardSkeleton() {
  return (
    <div className="h-[148px] animate-pulse overflow-hidden rounded-xl border border-border border-l-[3px] border-l-muted bg-card">
      <div className="flex h-full flex-col p-3.5">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
        <div className="mt-auto space-y-2">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-1.5 w-full rounded-full bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
