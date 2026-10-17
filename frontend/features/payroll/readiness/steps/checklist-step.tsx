"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PayrollReadiness, RunBlockerPage } from "@/hooks/api/payroll/readiness-schema";
import { countsByCategory, type ReadinessBlockerRow } from "../readiness-blockers";
import { ReadinessBlockersTable } from "../readiness-blockers-table";
import type { ReadinessCategoryKey } from "../readiness-categories";
import { ReadinessExports } from "../readiness-exports";
import { ReadinessPeopleRow, peopleVerdict } from "../readiness-people-row";
import { ReadinessStageList } from "../readiness-stage-list";
import { ReadinessTiles } from "../readiness-tiles";
import { StepNote, StepPanel } from "./step-panel";

interface ChecklistStepProps {
  readiness: PayrollReadiness;
  rows: readonly ReadinessBlockerRow[];
  runBlockers: RunBlockerPage | undefined;
  runId: number | null;
  headline: string;
  isCurrent: boolean;
}

function nextFix(readiness: PayrollReadiness, rows: readonly ReadinessBlockerRow[]): string | null {
  const people = peopleVerdict(readiness.people);
  if (people.blocked && people.action) return people.action.href;
  return rows.find((row) => row.severity === "blocker" && !row.isWaived && row.fix !== null)?.fix?.href ?? null;
}

export function ChecklistStep({ readiness, rows, runBlockers, runId, headline, isCurrent }: ChecklistStepProps) {
  const [activeCategory, setActiveCategory] = useState<ReadinessCategoryKey | null>(null);

  const handleSelectCategory = useCallback((key: ReadinessCategoryKey) => {
    setActiveCategory((current) => (current === key ? null : key));
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveCategory(null);
  }, []);

  const visibleRows = useMemo(
    () => (activeCategory === null ? rows : rows.filter((row) => row.categoryKey === activeCategory)),
    [rows, activeCategory],
  );

  const fixHref = isCurrent ? nextFix(readiness, rows) : null;
  const inputsLockedAt = readiness.inputs.lockedAt;

  return (
    <StepPanel
      title="Checklist blockers"
      cta={
        fixHref ? (
          <Button size="sm" className="min-h-11 sm:min-h-9" asChild>
            <Link href={fixHref}>Fix next blocker</Link>
          </Button>
        ) : null
      }
    >
      <StepNote>{headline}</StepNote>
      {isCurrent ? <StepNote>Processing stays locked until every blocker below is cleared or waived.</StepNote> : null}
      <ReadinessPeopleRow people={readiness.people} />
      <StepNote>
        {inputsLockedAt === null ? "Inputs for this month are not locked yet. " : "Inputs for this month are locked. "}
        <Link href="/payroll/inputs" className="underline underline-offset-2">
          Open inputs
        </Link>
      </StepNote>
      <ReadinessTiles
        counts={countsByCategory(rows)}
        runBlockersAvailable={runId !== null && runBlockers !== undefined}
        activeCategory={activeCategory}
        onSelect={handleSelectCategory}
      />
      <ReadinessBlockersTable
        rows={visibleRows}
        activeCategory={activeCategory}
        onClearFilter={handleClearFilter}
        truncated={runBlockers?.pagination.hasMore ?? false}
      />
      <ReadinessStageList stages={readiness.stages} />
      <ReadinessExports exports={readiness.exports} />
    </StepPanel>
  );
}
