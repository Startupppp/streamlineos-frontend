"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PlanUpsertSheet } from "@/features/hr/benefits/plan-upsert-sheet";
import { useBenefitPlans, type BenefitPlan } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";

interface BenefitsPlansAdminTabProps {
  canManage: boolean;
}

function buildPlanColumns(canManage: boolean, onEdit: (plan: BenefitPlan) => void): DataTableColumn<BenefitPlan>[] {
  const columns: DataTableColumn<BenefitPlan>[] = [
    { key: "name", header: "Name", cell: (plan) => <span className="text-sm font-medium">{plan.name}</span>, sortable: true, sortValue: (plan) => plan.name },
    { key: "category", header: "Category", cell: (plan) => <span className="text-xs capitalize">{plan.category}</span> },
    { key: "provider", header: "Provider", cell: (plan) => <span className="text-xs text-muted-foreground">{plan.provider ?? "—"}</span> },
    { key: "premium", header: "Premium", cell: (plan) => <span className="text-xs">{plan.premiumCents != null ? `₹${(plan.premiumCents / 100).toLocaleString("en-IN")}` : "—"}</span> },
    { key: "effectiveFrom", header: "Effective", cell: (plan) => <span className="text-xs">{plan.effectiveFrom}</span>, sortable: true, sortValue: (plan) => plan.effectiveFrom },
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
  const { data, isLoading, isFetching, isError, refetch } = useBenefitPlans({ cursor: cursors[cursorIndex] ?? undefined });
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

  if (isError) {
    return <ErrorState title="Couldn't load benefit plans" description="Failed to load benefit plans. Please try again." onRetry={handleRetry} className="flex-1" />;
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {canManage ? <div className="flex shrink-0 justify-end"><Button size="sm" className="gap-1.5" onClick={handleNew}><Plus className="h-3.5 w-3.5" />New Plan</Button></div> : null}
      <DataTable<BenefitPlan>
        className="flex-1 min-h-0"
        data={data?.data ?? []}
        columns={buildPlanColumns(canManage, handleEdit)}
        getRowKey={(plan) => plan.id}
        isLoading={isLoading}
        emptyState={<EmptyState illustrationPreset="payroll" title="No benefit plans" description="Create your first benefit plan to get started." action={canManage ? { label: "New Plan", onClick: handleNew } : undefined} className={CONTENT_FILL_PANEL} />}
      />
      {cursorIndex > 0 || data?.pagination.hasMore ? <CursorPageControls page={cursorIndex + 1} hasNext={data?.pagination.hasMore ?? false} disabled={isFetching} onPrevious={handlePreviousPage} onNext={handleNextPage} /> : null}
      <PlanUpsertSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} plan={editPlan} />
    </div>
  );
}
