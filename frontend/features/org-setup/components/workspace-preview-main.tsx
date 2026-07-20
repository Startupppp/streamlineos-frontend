"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Briefcase, LayoutDashboard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockGoalChip, MockStat, MockWidget } from "../lib/preview-mock-content";
import { MODULE_ICON } from "../lib/preview-mock-content";
import {
  PREVIEW_GRADIENT_CARD,
  PREVIEW_GRADIENT_HEADER,
  PREVIEW_GRADIENT_LIVE,
  PREVIEW_GRADIENT_MARK,
} from "../lib/preview-chrome";
import {
  fadeSlideItem,
  previewLayoutTransition,
  previewTransition,
  staggerContainer,
} from "../lib/preview-motion";
import { GoalChipsMarquee } from "./goal-chips-marquee";

type WorkspacePreviewMainProps = {
  companyLabel: string;
  industryLabel: string;
  metaLine: string;
  emptyCopy: string;
  compact: boolean;
  modules: readonly string[];
  goalChips: readonly MockGoalChip[];
  stats: readonly MockStat[];
  widgets: readonly MockWidget[];
};

export function WorkspacePreviewMain({
  companyLabel,
  industryLabel,
  metaLine,
  emptyCopy,
  compact,
  modules,
  goalChips,
  stats,
  widgets,
}: WorkspacePreviewMainProps) {
  const reduceMotion = useReducedMotion();
  const transition = previewTransition(reduceMotion);
  const layoutTransition = previewLayoutTransition(reduceMotion);
  const itemVariants = fadeSlideItem(reduceMotion);
  const listVariants = staggerContainer(reduceMotion);
  const hasModules = modules.length > 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background/40">
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-border/70",
          PREVIEW_GRADIENT_HEADER,
          compact ? "px-2.5 py-1.5" : "px-3 py-2.5 lg:px-4",
        )}
      >
        <div className="min-w-0">
          <motion.p
            layout={!reduceMotion}
            layoutId={reduceMotion ? undefined : "preview-company-title"}
            transition={layoutTransition}
            className={cn(
              "truncate font-display font-bold tracking-tight text-foreground",
              compact ? "text-xs" : "text-sm lg:text-[15px]",
            )}
          >
            {companyLabel}
          </motion.p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={industryLabel || "hint"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="truncate text-[11px] text-muted-foreground"
            >
              {industryLabel || "Your workspace after launch"}
            </motion.p>
          </AnimatePresence>
        </div>
        <motion.span
          layout={!reduceMotion}
          transition={layoutTransition}
          className={cn(
            "relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-core/25 px-2 py-0.5 text-[10px] font-medium text-brand-deep",
            PREVIEW_GRADIENT_LIVE,
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduceMotion && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-core/55 opacity-75" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brand-core to-brand-cyan" />
          </span>
          Live
        </motion.span>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          compact
            ? "gap-2 p-2"
            : "gap-2.5 p-2.5 sm:p-3 lg:gap-3 lg:p-3.5",
        )}
      >
        {!compact && (
          <div className="min-w-0 shrink-0 space-y-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-core/15 to-brand-cyan/10">
                <Sparkles className="h-3 w-3 text-brand-deep" aria-hidden />
              </span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={hasModules ? "outcomes" : "preview"}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
                  transition={transition}
                  className="truncate text-xs font-semibold text-foreground"
                >
                  {hasModules ? "What you get" : "Workspace preview"}
                </motion.p>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={metaLine || "hint"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="whitespace-normal text-[11px] leading-snug text-muted-foreground"
              >
                {metaLine || "Choose goals — this updates live"}
              </motion.p>
            </AnimatePresence>
            <GoalChipsMarquee chips={goalChips} />
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {!hasModules ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                transition={transition}
                className="absolute inset-0 flex min-h-[8rem] flex-col items-center justify-center gap-2 text-center"
              >
                <motion.div
                  layoutId={reduceMotion ? undefined : "preview-empty-mark"}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
                    PREVIEW_GRADIENT_MARK,
                  )}
                >
                  <LayoutDashboard
                    className="h-4 w-4 text-white"
                    aria-hidden
                  />
                </motion.div>
                <p className="max-w-[14rem] text-xs font-medium text-foreground">
                  {emptyCopy}
                </p>
                <p className="max-w-[15rem] text-[11px] text-muted-foreground">
                  Sidebar and dashboard fill in with the modules you enable
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="filled"
                variants={listVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0 }}
                transition={transition}
                className="absolute inset-0 flex min-h-0 flex-col gap-2 overflow-hidden lg:gap-2.5"
              >
                <div className="grid shrink-0 grid-cols-3 gap-1.5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {stats.map((stat) => (
                      <motion.div
                        key={stat.id}
                        layout={!reduceMotion}
                        layoutId={
                          reduceMotion
                            ? undefined
                            : `preview-stat-${stat.id}`
                        }
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={layoutTransition}
                        className={cn(
                          "min-w-0 rounded-lg border border-border/80 px-2.5 py-2 shadow-sm",
                          PREVIEW_GRADIENT_CARD,
                        )}
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
                  </AnimatePresence>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
                  <div
                    className={cn(
                      "grid content-start items-start gap-2",
                      compact || modules.length === 1
                        ? "grid-cols-1"
                        : "grid-cols-2",
                    )}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {widgets.map((widget) => {
                        const WidgetIcon =
                          MODULE_ICON[widget.id] ?? Briefcase;
                        return (
                          <motion.div
                            key={widget.id}
                            layout={!reduceMotion}
                            layoutId={
                              reduceMotion
                                ? undefined
                                : `preview-widget-${widget.id}`
                            }
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={layoutTransition}
                            className="h-auto min-w-0 self-start rounded-xl border border-border/80 bg-card shadow-sm"
                          >
                            <div
                              className={cn(
                                "flex items-start gap-2 border-b border-border/50 px-2.5 py-2.5 lg:px-3",
                                PREVIEW_GRADIENT_HEADER,
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm",
                                  PREVIEW_GRADIENT_MARK,
                                )}
                              >
                                <WidgetIcon
                                  className="h-3 w-3"
                                  aria-hidden
                                />
                              </span>
                              <div className="min-w-0 space-y-1">
                                <p className="truncate text-[11px] font-semibold leading-snug text-foreground">
                                  {widget.title}
                                </p>
                                {!compact && (
                                  <p className="truncate text-[10px] leading-snug text-muted-foreground">
                                    {widget.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ul className="space-y-1.5 px-2.5 pb-2.5 pt-2.5 lg:px-3 lg:pb-3 lg:pt-3">
                              {widget.rows.map((row, rowIndex) => (
                                <motion.li
                                  key={row}
                                  initial={{
                                    opacity: 0,
                                    x: reduceMotion ? 0 : 4,
                                  }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    ...transition,
                                    delay: reduceMotion
                                      ? 0
                                      : rowIndex * 0.04,
                                  }}
                                  className="truncate rounded-md bg-gradient-to-r from-muted/50 to-muted/30 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground"
                                >
                                  {row}
                                </motion.li>
                              ))}
                            </ul>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
