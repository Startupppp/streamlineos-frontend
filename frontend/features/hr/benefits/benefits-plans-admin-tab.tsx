"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { PlanUpsertSheet } from "@/features/hr/benefits/plan-upsert-sheet";
import { useBenefitPlans, type BenefitPlan } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";

interface BenefitsPlansAdminTabProps {
  canManage: boolean;
}

function buildPlanColumns(canManage: boolean, onEdit: (plan: BenefitPlan) => void, money: MoneyDisplay): DataTableColumn<BenefitPlan>[] {
  const columns: DataTableColumn<BenefitPlan>[] = [
    { key: "name", header: "Name", cell: (plan) => <span className="text-sm font-medium">{plan.name}</span> },
    { key: "category", header: "Category", cell: (plan) => <span className="text-xs capitalize">{plan.category}</span> },
    { key: "provider", header: "Provider", cell: (plan) => <span className="text-xs text-muted-foreground">{plan.provider ?? "—"}</span> },
    { key: "premium", header: "Premium", cell: (plan) => <span className="text-xs tabular-nums">{plan.premiumCents != null ? formatMoney(plan.premiumCents / 100, money) : "—"}</span> },
    { key: "effectiveFrom", header: "Effective", cell: (plan) => <span className="text-xs">{plan.effectiveFrom}</span> },
    {
      key: "status",
      header: "Status",
      cell: (plan) => (
        <Badge variant="outline" className={cn(
          "text-micro",
          plan.status === "active" && "bg-status-success-surface text-status-success-ink border-status-success-rule",
          plan.status === "draft" && "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
          plan.status === "archived" && "bg-muted text-muted-foreground border-border",
        )}>
          {plan.status}
        </Badge>
      ),
    },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      className: "w-16",
      cell: (plan) => {
        function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
          event.stopPropagation();
          onEdit(plan);
        }
        return <Button size="sm" variant="ghost" className="text-xs" onClick={handleEditClick}>Edit</Button>;
      },
    });
  }
  return columns;
}

export function BenefitsPlansAdminTab({ canManage }: BenefitsPlansAdminTabProps) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const { data, isLoading, isFetching, isError, error, refetch } = useBenefitPlans({ cursor: cursors[cursorIndex] ?? undefined });
  const money = useOrgDisplay();
  const pageState = usePageState({ permission: "hr:benefits:view", module: "hr", isLoading, isError, error });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<BenefitPlan>();
  const handleNew = useCallback(() => { setEditPlan(undefined); setSheetOpen(true); }, []);
  const handleEdit = useCallback((plan: BenefitPlan) => { setEditPlan(plan); setSheetOpen(true); }, []);
  const handleSheetOpenChange = useCallback((open: boolean) => { setSheetOpen(open); if (!open) setEditPlan(undefined); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  function handlePreviousPage() {
    setCursorIndex((current) => Math.max(0, current - 1));
  }

  function handleNextPage() {
    const nextCursor = data?.pagination.nextCursor;
    if (!nextCursor) return;
    setCursors((current) => [...current.slice(0, cursorIndex + 1), nextCursor]);
    setCursorIndex((current) => current + 1);
  }


  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {canManage ? <div className="flex shrink-0 justify-end"><Button size="sm" className="gap-1.5" onClick={handleNew}><Plus className="h-3.5 w-3.5" />New plan</Button></div> : null}
      <PageState resolution={pageState} loading={<LoadingState variant="table" />} onRetry={handleRetry} className="flex-1">
        <DataTable<BenefitPlan>
          className="flex-1 min-h-0"
          data={data?.data ?? []}
          columns={buildPlanColumns(canManage, handleEdit, money)}
          getRowKey={(plan) => plan.id}
          emptyState={<EmptyState illustrationPreset="payroll" title="No benefit plans" description="Create your first benefit plan to get started." action={canManage ? { label: "New plan", onClick: handleNew } : undefined} className={CONTENT_FILL_PANEL} />}
        />
      </PageState>
      {cursorIndex > 0 || data?.pagination.hasMore ? <CursorPageControls page={cursorIndex + 1} hasNext={data?.pagination.hasMore ?? false} disabled={isFetching} onPrevious={handlePreviousPage} onNext={handleNextPage} /> : null}
      <PlanUpsertSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} plan={editPlan} />
    </div>
  );
}
