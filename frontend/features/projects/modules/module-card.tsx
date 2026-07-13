"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Module } from "@/types/projects/projects";
import type { ModuleStatus } from "@/types/projects/shared";
import { getModuleAvatarDisplay } from "@/features/projects/modules/lib/module-name";

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
    accentBar: "from-slate-400/50 to-transparent",
    badge: "bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-300 dark:border-slate-700",
    progressBar: "from-slate-500 to-slate-400",
    avatar: "bg-slate-500/10 text-slate-600 ring-slate-500/20",
  },
  planned: {
    label: "Planned",
    stripe: "border-l-blue-400",
    accentBar: "from-blue-400/60 to-transparent",
    badge: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-800",
    progressBar: "from-blue-600 to-blue-400",
    avatar: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
  },
  "in-progress": {
    label: "In Progress",
    stripe: "border-l-blue-600",
    accentBar: "from-blue-600/70 via-blue-500/30 to-transparent",
    badge: "bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-700",
    progressBar: "from-blue-700 via-blue-500 to-cyan-400",
    avatar: "bg-blue-500/15 text-blue-600 ring-blue-500/25",
  },
  paused: {
    label: "Paused",
    stripe: "border-l-amber-500",
    accentBar: "from-amber-500/60 to-transparent",
    badge: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800",
    progressBar: "from-amber-500 to-amber-400",
    avatar: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  },
  completed: {
    label: "Completed",
    stripe: "border-l-emerald-500",
    accentBar: "from-emerald-500/60 to-transparent",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800",
    progressBar: "from-emerald-600 to-emerald-400",
    avatar: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  },
  cancelled: {
    label: "Cancelled",
    stripe: "border-l-red-500",
    accentBar: "from-red-500/50 to-transparent",
    badge: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-300 dark:border-red-800",
    progressBar: "from-red-500 to-red-400",
    avatar: "bg-red-500/10 text-red-600 ring-red-500/20",
  },
};

function formatModuleDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-US", {
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
        href={`/projects/${projectId}?module=${mod.id}`}
        className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      >
        <article
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card",
            "border-l-[3px] shadow-sm",
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
                  isEmojiAvatar ? "text-xl leading-none" : "text-[11px] font-bold tracking-tight",
                  style.avatar,
                )}
                aria-hidden="true"
              >
                {avatarDisplay}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {mod.name}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      style.badge,
                    )}
                  >
                    {style.label}
                  </span>
                </div>

                {mod.description ? (
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {mod.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
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
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                  <span className="truncate">
                    {formatModuleDate(mod.startDate)} — {formatModuleDate(mod.endDate)}
                  </span>
                </p>
              ) : null}

              {mod.leadId ? (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
