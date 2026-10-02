"use client";

import { useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { hrmsRowCollapse, hrmsRowCollapseReduced, hrmsSm, hrmsTransition, hrmsVariants } from "@/lib/hrms/motion";
import { BLOCKER_COLUMNS, FixCell, PersonCell, ReasonCell } from "./readiness-columns";
import { readinessCategory, type ReadinessCategoryKey } from "./readiness-categories";
import type { ReadinessBlockerRow } from "./readiness-blockers";

const BLOCKER_PAGE_SIZE = 25;

interface ReadinessBlockersTableProps {
  rows: readonly ReadinessBlockerRow[];
  activeCategory: ReadinessCategoryKey | null;
  onClearFilter: () => void;
  truncated: boolean;
}

function MobileBlockerCard({ row }: { row: ReadinessBlockerRow }) {
  return (
    <div className="space-y-2 border-b border-border p-3">
      <PersonCell row={row} />
      <p className="text-micro text-muted-foreground">
        {row.categoryLabel} · {row.owner}
      </p>
      <ReasonCell row={row} />
      <div className="sticky bottom-0 flex justify-end bg-card pt-1">
        <FixCell row={row} />
      </div>
    </div>
  );
}

export function ReadinessBlockersTable({
  rows,
  activeCategory,
  onClearFilter,
  truncated,
}: ReadinessBlockersTableProps) {
  const reduced = useReducedMotion();
  const filterLabel = activeCategory === null ? null : readinessCategory(activeCategory).label;

  const renderMobileCard = useCallback((row: ReadinessBlockerRow) => <MobileBlockerCard row={row} />, []);
  const rowKey = useCallback((row: ReadinessBlockerRow) => row.id, []);

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3" aria-label="Readiness blockers">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Blockers</h3>
          <p className="text-micro text-muted-foreground">
            {filterLabel === null ? "Every category this cycle can measure" : `Filtered to ${filterLabel}`}
            {truncated ? " · showing the first 100 run blockers" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-dense tabular-nums text-muted-foreground">{rows.length}</span>
          {filterLabel === null ? null : (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClearFilter}>
              Clear filter
            </Button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        <motion.div
          key={rows.length === 0 ? "empty" : "rows"}
          variants={hrmsVariants(reduced, hrmsRowCollapse, hrmsRowCollapseReduced)}
          initial="hidden"
          animate="show"
          exit="hidden"
          transition={hrmsTransition(reduced, hrmsSm)}
        >
          {rows.length === 0 ? (
            <EmptyState
              compact
              illustrationPreset="approval"
              filtersActive={filterLabel !== null}
              onClearFilters={onClearFilter}
              title="Nothing is blocking this cycle"
              description="Every blocker this cycle can measure is clear. Categories marked Not measured are not covered by this check."
            />
          ) : (
            <DataTable
              data={[...rows]}
              columns={BLOCKER_COLUMNS}
              getRowKey={rowKey}
              mobileCard={renderMobileCard}
              pagination={{ pageSize: BLOCKER_PAGE_SIZE }}
              scrollRegionLabel="Readiness blockers"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
