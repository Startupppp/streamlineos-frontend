"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ReadinessBadge } from "@/components/shared/readiness-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hrmsListStagger, hrmsRowEnter, hrmsRowEnterReduced, hrmsTransition, hrmsVariants } from "@/lib/hrms/motion";
import { cn } from "@/lib/utils";
import {
  READINESS_CATEGORIES,
  categoryIsMeasured,
  type ReadinessCategory,
  type ReadinessCategoryKey,
} from "./readiness-categories";

const TILE_GRID_CLASS = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5";
const TILE_SHELL_CLASS = "flex min-h-[72px] flex-col justify-between rounded-lg border border-border bg-card p-2.5 text-left";

interface ReadinessTileProps {
  category: ReadinessCategory;
  count: number;
  measured: boolean;
  active: boolean;
  index: number;
  onSelect: (key: ReadinessCategoryKey) => void;
}

function ReadinessTile({ category, count, measured, active, index, onSelect }: ReadinessTileProps) {
  const reduced = useReducedMotion();

  const handleClick = useCallback(() => {
    onSelect(category.key);
  }, [onSelect, category.key]);

  const body = (
    <>
      <span className="text-dense font-medium leading-snug text-foreground">{category.label}</span>
      {measured ? (
        <span className="text-base font-semibold tabular-nums text-foreground">{count}</span>
      ) : (
        <ReadinessBadge state="unmeasured" />
      )}
    </>
  );

  if (!measured) {
    return (
      <motion.div
        className={cn(TILE_SHELL_CLASS, "opacity-80")}
        title={category.unmeasuredReason ?? "Not measured for this cycle."}
        variants={hrmsVariants(reduced, hrmsRowEnter, hrmsRowEnterReduced)}
        initial="hidden"
        animate="show"
        transition={hrmsTransition(reduced, hrmsListStagger(index))}
      >
        {body}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        TILE_SHELL_CLASS,
        "min-h-11 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary",
      )}
      variants={hrmsVariants(reduced, hrmsRowEnter, hrmsRowEnterReduced)}
      initial="hidden"
      animate="show"
      transition={hrmsTransition(reduced, hrmsListStagger(index))}
    >
      {body}
    </motion.button>
  );
}

interface ReadinessTilesProps {
  counts: Readonly<Partial<Record<ReadinessCategoryKey, number>>>;
  runBlockersAvailable: boolean;
  activeCategory: ReadinessCategoryKey | null;
  onSelect: (key: ReadinessCategoryKey) => void;
}

export function ReadinessTiles({ counts, runBlockersAvailable, activeCategory, onSelect }: ReadinessTilesProps) {
  return (
    <section aria-label="Readiness categories" className="space-y-2">
      <div className={TILE_GRID_CLASS}>
        {READINESS_CATEGORIES.map((category, index) => (
          <ReadinessTile
            key={category.key}
            category={category}
            count={counts[category.key] ?? 0}
            measured={categoryIsMeasured(category, runBlockersAvailable)}
            active={activeCategory === category.key}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function ReadinessTilesSkeleton() {
  return (
    <div className={TILE_GRID_CLASS} aria-hidden>
      {READINESS_CATEGORIES.map((category) => (
        <Skeleton key={category.key} className="min-h-[72px] rounded-lg" />
      ))}
    </div>
  );
}
