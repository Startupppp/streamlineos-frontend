"use client";

import { useState } from "react";
import { AlertCircle, Calendar, Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/shared";
import { FinanceStatusBadge } from "@/features/accounting/shared";
import { PeriodChecklistPanel } from "@/features/accounting/core/period-checklist-panel";
import { GeneratePeriodsDialog } from "@/features/accounting/core/generate-periods-dialog";
import { usePeriods, usePeriodChecklist } from "@/hooks/api/accounting/core";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import type { AccountingPeriod } from "@/hooks/api/accounting/core";

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

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
        {formatDate(period.startDate)} — {formatDate(period.endDate)}
      </p>
      {period.closedBy && period.closedAt && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Closed by {period.closedBy}
        </p>
      )}
    </button>
  );
}

export default function PeriodClosePage() {
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
          <Button size="sm" onClick={handleOpenGenerate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Generate periods
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 px-4 text-center">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No periods yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate fiscal periods to get started.
              </p>
              {canManage && (
                <Button size="sm" className="mt-3" onClick={handleOpenGenerate}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Generate periods
                </Button>
              )}
            </div>
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16 px-6 text-center h-full min-h-[300px]">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted text-muted-foreground mb-3">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No period selected</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Select a period from the list to view its close checklist.
              </p>
            </div>
          )}
        </div>
      </div>

      <GeneratePeriodsDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </PageWrapper>
  );
}