"use client";

import { memo, useMemo, type ComponentType } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Briefcase,
  Contact2,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Users,
} from "lucide-react";
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

const MODULE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  CRM: Contact2,
  HR: Users,
  INVENTORY: Package,
  FINANCE: Receipt,
  PROJECTS: Briefcase,
  HELPDESK: Headphones,
  KNOWLEDGE: BookOpen,
  CHAT: MessageSquare,
};

const STAT_PRESETS: Record<string, { label: string; value: string }> = {
  CRM: { label: "Open leads", value: "12" },
  HR: { label: "Team", value: "24" },
  PROJECTS: { label: "Active tasks", value: "8" },
  FINANCE: { label: "Invoices", value: "5" },
  INVENTORY: { label: "SKUs", value: "140" },
  HELPDESK: { label: "Tickets", value: "3" },
  KNOWLEDGE: { label: "Docs", value: "18" },
  CHAT: { label: "Channels", value: "6" },
};

const WIDGET_ROWS: Record<string, readonly string[]> = {
  CRM: ["Acme discovery call", "Pipeline review", "Follow-up · Contoso"],
  HR: ["Leave balance · 12 days", "2 birthdays this week", "Attendance 96%"],
  PROJECTS: ["Ship onboarding UI", "Review sprint board", "Sync with design"],
  FINANCE: ["Invoice INV-104 due", "Reconcile bank feed", "Q2 forecast draft"],
  INVENTORY: ["Reorder low stock", "Warehouse A audit", "Receive PO-882"],
  HELPDESK: ["SLA · billing query", "New chat from Acme", "Escalate #214"],
  KNOWLEDGE: ["Update leave SOP", "Publish security FAQ", "Draft onboarding wiki"],
  CHAT: ["#general · 4 unread", "#ops standup", "DM · Priya"],
};

type MockStat = { id: string; label: string; value: string };
type MockWidget = { id: string; title: string; rows: readonly string[] };

function buildStats(modules: readonly string[], teamSize: string): MockStat[] {
  const stats: MockStat[] = modules.slice(0, 3).map((key) => {
    const preset = STAT_PRESETS[key];
    return {
      id: key,
      label: preset?.label ?? (MODULE_CATALOG[key]?.label ?? key),
      value:
        key === "HR" && teamSize
          ? teamSize.replace("+", "")
          : (preset?.value ?? "—"),
    };
  });
  while (stats.length < 3) {
    const fillers: MockStat[] = [
      { id: "goals", label: "Goals", value: "—" },
      { id: "ready", label: "Ready", value: "0%" },
      { id: "invites", label: "Invites", value: "0" },
    ];
    const next = fillers[stats.length];
    if (!next) break;
    stats.push(next);
  }
  return stats;
}

function buildWidgets(modules: readonly string[]): MockWidget[] {
  const keys = modules.slice(0, 3);
  if (keys.length === 0) return [];
  return keys.map((key) => ({
    id: key,
    title: MODULE_CATALOG[key]?.label ?? key,
    rows: WIDGET_ROWS[key] ?? ["Getting ready…"],
  }));
}

function WorkspacePreviewMockInner({
  snapshot,
  className,
  compact = false,
}: WorkspacePreviewMockProps) {
  const reduceMotion = useReducedMotion();
  const modules = useMemo(
    () =>
      (snapshot.modules.length > 0 ? snapshot.modules : snapshot.installedApps).slice(
        0,
        6,
      ),
    [snapshot.modules, snapshot.installedApps],
  );
  const companyLabel = snapshot.companyName.trim() || "Your workspace";
  const industryLabel = snapshot.industry.trim();
  const modulesKey = modules.join(",");
  const stats = useMemo(
    () => buildStats(modules, snapshot.teamSize),
    [modules, snapshot.teamSize],
  );
  const widgets = useMemo(() => buildWidgets(modules), [modules]);
  const metaLine = [
    snapshot.goals.length > 0
      ? `${snapshot.goals.length} goal${snapshot.goals.length === 1 ? "" : "s"}`
      : null,
    snapshot.teamSize || null,
    snapshot.inviteesCount > 0
      ? `${snapshot.inviteesCount} invite${snapshot.inviteesCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const stagger = reduceMotion ? 0 : 0.05;
  const tileTransition = { duration: reduceMotion ? 0.01 : 0.22, ease: EASE };

  return (
    <div className={cn("relative flex h-full min-h-0 w-full min-w-0", className)}>
      <div
        className={cn(
          "pointer-events-none absolute -z-10 rounded-[2rem] bg-gradient-to-br from-brand-bright/20 via-brand-cyan/12 to-transparent blur-2xl",
          compact ? "-inset-2" : "-inset-4",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_28px_60px_-32px_rgba(30,64,175,0.28)]",
          compact
            ? "h-[220px]"
            : "h-full max-h-full min-h-[320px] lg:min-h-[360px] xl:min-h-[400px] 2xl:min-h-[440px]",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1">
          <aside
            className={cn(
              "flex shrink-0 flex-col border-r border-border/70 bg-muted/35",
              compact
                ? "w-10 gap-1 p-1.5"
                : "w-11 gap-1 p-2 xl:w-[7.25rem] xl:gap-0.5 xl:p-2.5",
            )}
          >
            <div
              className={cn(
                "mb-1.5 flex items-center justify-center rounded-lg bg-gradient-to-br from-brand-core to-brand-cyan font-bold text-white",
                compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px] xl:mb-2",
              )}
            >
              {(companyLabel[0] ?? "S").toUpperCase()}
            </div>

            <div
              className={cn(
                "mb-1 flex items-center justify-center rounded-md bg-primary/10 text-primary",
                compact ? "h-7" : "h-8 xl:justify-start xl:gap-2 xl:px-2",
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {!compact && (
                <span className="hidden truncate text-[11px] font-medium xl:inline">
                  Home
                </span>
              )}
            </div>

            <LayoutGroup>
              <AnimatePresence initial={false} mode="popLayout">
                {modules.length === 0
                  ? [0, 1, 2].map((i) => (
                      <div
                        key={`ph-${i}`}
                        className={cn(
                          "rounded-md bg-border/50",
                          compact ? "h-7" : "h-8",
                        )}
                      />
                    ))
                  : modules.map((key) => {
                      const Icon = MODULE_ICON[key] ?? Briefcase;
                      const label = MODULE_CATALOG[key]?.label ?? key;
                      return (
                        <motion.div
                          key={key}
                          layout={!reduceMotion}
                          initial={{
                            opacity: 0,
                            x: reduceMotion ? 0 : -8,
                          }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{
                            opacity: 0,
                            x: reduceMotion ? 0 : -6,
                            transition: { duration: 0.14 },
                          }}
                          transition={tileTransition}
                          className={cn(
                            "flex items-center justify-center rounded-md border border-transparent text-muted-foreground",
                            compact
                              ? "h-7"
                              : "h-8 xl:justify-start xl:gap-2 xl:px-2",
                            "bg-card/60",
                          )}
                          title={label}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {!compact && (
                            <span className="hidden truncate text-[11px] font-medium xl:inline">
                              {label}
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
              </AnimatePresence>
            </LayoutGroup>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-background/40">
            <header
              className={cn(
                "flex shrink-0 items-center justify-between gap-2 border-b border-border/70",
                compact ? "px-2.5 py-1.5" : "px-3 py-2.5 lg:px-4",
              )}
            >
              <div className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={companyLabel}
                    initial={{
                      opacity: 0,
                      y: reduceMotion ? 0 : 6,
                    }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      y: reduceMotion ? 0 : -4,
                    }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className={cn(
                      "truncate font-display font-bold tracking-tight text-foreground",
                      compact ? "text-xs" : "text-sm lg:text-[15px]",
                    )}
                  >
                    {companyLabel}
                  </motion.p>
                </AnimatePresence>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={industryLabel || "hint"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="truncate text-[11px] text-muted-foreground"
                  >
                    {industryLabel || "Pick goals to shape your modules"}
                  </motion.p>
                </AnimatePresence>
              </div>
              <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-core/25 bg-brand-core/10 px-2 py-0.5 text-[10px] font-medium text-brand-deep">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduceMotion && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-core/55 opacity-75" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-core" />
                </span>
                Live
              </span>
            </header>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-hidden",
                compact ? "space-y-2 p-2" : "space-y-2.5 p-2.5 sm:p-3 lg:space-y-3 lg:p-3.5",
              )}
            >
              {!compact && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    Welcome back
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {metaLine || "Your home dashboard preview"}
                  </p>
                </div>
              )}

              {modules.length === 0 ? (
                <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-core/10">
                    <LayoutDashboard
                      className="h-4 w-4 text-brand-deep"
                      aria-hidden
                    />
                  </div>
                  <p className="max-w-[14rem] text-xs text-muted-foreground">
                    Your dashboard takes shape as you choose goals
                  </p>
                </div>
              ) : (
                <motion.div
                  key={modulesKey}
                  layout={!reduceMotion}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: { staggerChildren: stagger },
                    },
                  }}
                  className="flex min-h-0 flex-col gap-2 lg:gap-2.5"
                >
                  <div
                    className={cn(
                      "grid gap-1.5",
                      compact ? "grid-cols-3" : "grid-cols-3",
                    )}
                  >
                    {stats.map((stat) => (
                      <motion.div
                        key={stat.id}
                        layout={!reduceMotion}
                        variants={{
                          hidden: {
                            opacity: 0,
                            y: reduceMotion ? 0 : 8,
                          },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: tileTransition,
                          },
                        }}
                        className="min-w-0 rounded-lg border border-border/80 bg-card px-2 py-1.5 shadow-sm lg:px-2.5 lg:py-2"
                      >
                        <p className="truncate text-[10px] text-muted-foreground">
                          {stat.label}
                        </p>
                        <p
                          className={cn(
                            "truncate font-display font-bold tracking-tight text-foreground",
                            compact ? "text-sm" : "text-base lg:text-lg",
                          )}
                        >
                          {stat.value}
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <div
                    className={cn(
                      "grid min-h-0 gap-1.5",
                      compact
                        ? "grid-cols-1"
                        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                    )}
                  >
                    {widgets.map((widget) => {
                      const WidgetIcon = MODULE_ICON[widget.id] ?? Briefcase;
                      return (
                        <motion.div
                          key={widget.id}
                          layout={!reduceMotion}
                          variants={{
                            hidden: {
                              opacity: 0,
                              y: reduceMotion ? 0 : 10,
                            },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: tileTransition,
                            },
                          }}
                          className="min-w-0 rounded-xl border border-border/80 bg-card p-2 shadow-sm lg:p-2.5"
                        >
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                              <WidgetIcon
                                className="h-3 w-3 text-primary"
                                aria-hidden
                              />
                            </span>
                            <p className="truncate text-[11px] font-semibold text-foreground">
                              {widget.title}
                            </p>
                          </div>
                          <ul className="space-y-1">
                            {widget.rows.slice(0, compact ? 1 : 2).map((row) => (
                              <li
                                key={row}
                                className="truncate rounded-md bg-muted/40 px-1.5 py-1 text-[10px] text-muted-foreground"
                              >
                                {row}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
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
