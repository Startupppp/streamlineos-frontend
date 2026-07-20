"use client";

import { memo, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MODULE_CATALOG } from "../lib/constants";
import type { WorkspacePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";

type WorkspacePreviewMockProps = {
  snapshot: WorkspacePreviewSnapshot;
  className?: string;
  compact?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

const MODULE_TINT: Record<string, string> = {
  CRM: "from-brand-core/20 to-brand-cyan/10",
  HR: "from-brand-bright/25 to-brand-core/10",
  INVENTORY: "from-brand-cyan/20 to-brand-core/10",
  FINANCE: "from-brand-deep/15 to-brand-core/10",
  PROJECTS: "from-brand-core/15 to-brand-bright/10",
  HELPDESK: "from-brand-cyan/15 to-brand-bright/10",
  KNOWLEDGE: "from-brand-core/10 to-muted",
  CHAT: "from-brand-bright/15 to-muted",
};

function WorkspacePreviewMockInner({
  snapshot,
  className,
  compact = false,
}: WorkspacePreviewMockProps) {
  const reduceMotion = useReducedMotion();
  const modules = useMemo(
    () =>
      (snapshot.modules.length > 0 ? snapshot.modules : snapshot.installedApps).slice(0, 6),
    [snapshot.modules, snapshot.installedApps],
  );
  const companyLabel = snapshot.companyName.trim() || "Your workspace";
  const industryLabel = snapshot.industry.trim();
  const modulesKey = modules.join(",");

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div
        className={cn(
          "pointer-events-none absolute -z-10 rounded-[2rem] bg-gradient-to-br from-brand-bright/20 via-brand-cyan/12 to-transparent blur-2xl",
          compact ? "-inset-2" : "-inset-3",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_24px_50px_-28px_rgba(30,64,175,0.24)] backdrop-blur-sm",
          compact ? "h-[200px] sm:h-[220px]" : "h-[280px] xl:h-[320px] 2xl:h-[340px]",
        )}
      >
        <div className="flex h-full min-w-0">
          <aside
            className={cn(
              "flex shrink-0 flex-col gap-1.5 border-r border-border/70 bg-muted/40",
              compact ? "w-10 p-1.5 sm:w-11" : "w-12 p-2 xl:w-14",
            )}
          >
            <div
              className={cn(
                "mb-1 flex items-center justify-center rounded-lg bg-foreground text-[10px] font-bold text-background",
                compact ? "h-7 w-7" : "h-8 w-8",
              )}
            >
              {(companyLabel[0] ?? "S").toUpperCase()}
            </div>
            <AnimatePresence initial={false} mode="popLayout">
              {modules.length === 0
                ? [0, 1, 2].map((i) => (
                    <div key={`ph-${i}`} className="h-6 rounded-md bg-border/60" />
                  ))
                : modules.map((key) => (
                    <motion.div
                      key={key}
                      layout={!reduceMotion}
                      initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: reduceMotion ? 0 : -4 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className={cn(
                        "flex items-center justify-center rounded-md border border-brand-core/20 bg-brand-core/10 text-[9px] font-semibold text-brand-deep",
                        compact ? "h-7" : "h-8",
                      )}
                      title={MODULE_CATALOG[key]?.label ?? key}
                    >
                      {(MODULE_CATALOG[key]?.label ?? key).slice(0, 2).toUpperCase()}
                    </motion.div>
                  ))}
            </AnimatePresence>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-display text-[13px] font-bold tracking-tight text-foreground">
                  {companyLabel}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {industryLabel || "Pick goals to shape your modules"}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-brand-core/25 bg-brand-core/10 px-2 py-0.5 text-[10px] font-medium text-brand-deep">
                Live
              </span>
            </header>

            <div className={cn("min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3", compact ? "space-y-2" : "space-y-2.5")}>
              {modules.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <div className="h-9 w-9 rounded-xl bg-brand-core/10" />
                  <p className="max-w-[12rem] text-[12px] text-muted-foreground">
                    Your modules appear here as you choose goals
                  </p>
                </div>
              ) : (
                <motion.div
                  key={modulesKey}
                  initial={{ opacity: reduceMotion ? 1 : 0.65 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className={cn(
                    "grid gap-2",
                    compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3",
                  )}
                >
                  {modules.map((key) => {
                    const meta = MODULE_CATALOG[key];
                    return (
                      <div
                        key={key}
                        className={cn(
                          "min-w-0 rounded-xl border border-border/80 bg-gradient-to-br p-2.5",
                          MODULE_TINT[key] ?? "from-muted to-card",
                        )}
                      >
                        <p className="truncate text-[11px] font-semibold text-foreground">
                          {meta?.label ?? key}
                        </p>
                        {!compact && meta?.description && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                            {meta.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {!compact && snapshot.goals.length > 0 && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {snapshot.goals.length} goal{snapshot.goals.length === 1 ? "" : "s"}
                  {snapshot.teamSize ? ` · ${snapshot.teamSize}` : ""}
                  {snapshot.inviteesCount > 0
                    ? ` · ${snapshot.inviteesCount} invite${snapshot.inviteesCount === 1 ? "" : "s"}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const WorkspacePreviewMock = memo(WorkspacePreviewMockInner, (prev, next) => {
  return (
    prev.compact === next.compact &&
    prev.className === next.className &&
    previewSnapshotsEqual(prev.snapshot, next.snapshot)
  );
});
