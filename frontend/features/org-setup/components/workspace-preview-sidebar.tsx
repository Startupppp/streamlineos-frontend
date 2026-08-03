"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Briefcase, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULE_CATALOG } from "../lib/constants";
import { MODULE_ICON } from "../lib/preview-mock-content";
import {
  PREVIEW_GRADIENT_ASIDE,
  PREVIEW_GRADIENT_MARK,
} from "../lib/preview-chrome";
import {
  previewLayoutTransition,
  previewTransition,
  sidebarItemVariants,
} from "../lib/preview-motion";
import type { OrgModuleKey } from "../lib/wizard-data-schema";

type WorkspacePreviewSidebarProps = {
  modules: readonly OrgModuleKey[];
  companyLabel: string;
  companyInitial: string;
  compact: boolean;
};

export function WorkspacePreviewSidebar({
  modules,
  companyLabel,
  companyInitial,
  compact,
}: WorkspacePreviewSidebarProps) {
  const reduceMotion = useReducedMotion();
  const transition = previewTransition(reduceMotion);
  const layoutTransition = previewLayoutTransition(reduceMotion);
  const navVariants = sidebarItemVariants(reduceMotion);
  const hasModules = modules.length > 0;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-border/70",
        PREVIEW_GRADIENT_ASIDE,
        compact
          ? "w-10 gap-1 p-1.5"
          : "w-11 gap-1 p-2 xl:w-[7.5rem] xl:gap-0.5 xl:p-2.5",
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center",
          compact
            ? "justify-center"
            : "justify-center xl:mb-2 xl:justify-start xl:gap-2",
        )}
      >
        <motion.div
          layoutId={reduceMotion ? undefined : "preview-company-mark"}
          transition={layoutTransition}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg font-bold text-white shadow-sm",
            PREVIEW_GRADIENT_MARK,
            compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={companyInitial}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
              transition={transition}
            >
              {companyInitial}
            </motion.span>
          </AnimatePresence>
        </motion.div>
        {!compact && (
          <motion.span
            layoutId={reduceMotion ? undefined : "preview-company-side"}
            transition={layoutTransition}
            className="hidden min-w-0 truncate text-[11px] font-semibold text-foreground xl:inline"
          >
            {companyLabel}
          </motion.span>
        )}
      </div>

      <motion.div
        layout={!reduceMotion}
        transition={layoutTransition}
        className={cn(
          "relative mb-1 flex items-center justify-center rounded-md border border-brand-core/25 text-brand-deep",
          "bg-gradient-to-r from-brand-core/12 to-brand-cyan/10",
          compact ? "h-7" : "h-8 xl:justify-start xl:gap-2 xl:px-2",
        )}
      >
        {!reduceMotion && (
          <motion.span
            layoutId="preview-nav-active"
            className="absolute inset-0 rounded-md bg-gradient-to-r from-brand-core/10 to-brand-cyan/8"
            transition={layoutTransition}
          />
        )}
        <LayoutDashboard
          className="relative z-[1] h-3.5 w-3.5 shrink-0"
          aria-hidden
        />
        {!compact && (
          <span className="relative z-[1] hidden truncate text-[11px] font-semibold xl:inline">
            Home
          </span>
        )}
      </motion.div>

      <div className="flex min-h-0 flex-col gap-1 xl:gap-0.5">
        <AnimatePresence initial={false} mode="popLayout">
          {!hasModules
            ? [0, 1, 2].map((i) => (
                <motion.div
                  key={`ph-${i}`}
                  layout={!reduceMotion}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className={cn(
                    "rounded-md border border-dashed border-border/70 bg-gradient-to-r from-border/40 to-border/20",
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
                    layoutId={
                      reduceMotion ? undefined : `preview-nav-${key}`
                    }
                    variants={navVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={layoutTransition}
                    className={cn(
                      "flex items-center justify-center rounded-md border border-transparent bg-card/70 text-muted-foreground",
                      compact
                        ? "h-7"
                        : "h-8 xl:justify-start xl:gap-2 xl:px-2",
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
      </div>
    </aside>
  );
}
