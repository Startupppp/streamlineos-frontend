"use client";

import { useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { PeriodChecklistPanel } from "@/features/accounting/core/period-checklist-panel";
import { GeneratePeriodsDialog } from "@/features/accounting/core/generate-periods-dialog";
import { usePeriods, usePeriodChecklist } from "@/hooks/api/accounting/core";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";
import type { AccountingPeriod } from "@/hooks/api/accounting/core";

interface PeriodButtonProps {
  period: AccountingPeriod;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function PeriodButton({ period, isSelected, onSelect }: PeriodButtonProps) {
  function handleClick() {
    onSelect(period.id);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{period.name}</span>
        <FinanceStatusBadge status={period.status} size="row" />
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">
        {formatShortDate(period.startDate) || ""} — {formatShortDate(period.endDate) || ""}
      </p>
      {period.closedBy && period.closedAt && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Closed by {period.closedBy}
        </p>
      )}
    </button>
  );
}

export function PeriodClosePage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const canManage = useCan("accounting:periods:manage");
  const canReopen = useCan("accounting:periods:reopen");

  const periodsQuery = usePeriods();
  const periods = periodsQuery.data ?? [];

  const checklistQuery = usePeriodChecklist(selectedPeriodId ?? 0, selectedPeriodId !== null);
  const selectedPeriod = periods.find((p: AccountingPeriod) => p.id === selectedPeriodId);

  function handlePeriodSelect(id: number): void {
    setSelectedPeriodId(id === selectedPeriodId ? null : id);
  }

  function handleRetry(): void {
    void periodsQuery.refetch();
  }

  function handleOpenGenerate(): void {
    setGenerateOpen(true);
  }

  return (
    <PageWrapper
      title="Period Close"
      subtitle="Manage fiscal periods and close checklists."
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={14} size="sm" onClick={handleOpenGenerate}>
            Generate periods
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 space-y-2">
          {periodsQuery.isLoading ? (
            <LoadingState variant="table" rows={12} />
          ) : periodsQuery.error ? (
            <ErrorState
              title="Failed to load periods"
              description={getErrorMessage(periodsQuery.error)}
              onRetry={handleRetry}
            />
          ) : periods.length === 0 ? (
            <EmptyState
              compact
              title="No periods yet"
              description="Generate fiscal periods to get started."
              action={canManage ? { label: "Generate periods", onClick: handleOpenGenerate } : undefined}
            />
          ) : (
            periods.map((period: AccountingPeriod) => (
              <PeriodButton
                key={period.id}
                period={period}
                isSelected={selectedPeriodId === period.id}
                onSelect={handlePeriodSelect}
              />
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedPeriod ? (
            <PeriodChecklistPanel
              period={selectedPeriod}
              checklist={checklistQuery.data}
              isLoading={checklistQuery.isLoading}
              canManage={canManage}
              canReopen={canReopen}
            />
          ) : (
            <EmptyState
              title="No period selected"
              description="Select a period from the list to view its close checklist."
            />
          )}
        </div>
      </div>

      <GeneratePeriodsDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </PageWrapper>
  );
}
