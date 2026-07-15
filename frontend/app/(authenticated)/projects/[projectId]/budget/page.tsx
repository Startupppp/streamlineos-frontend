"use client";

import { use, useState, useMemo, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IndianRupee, TrendingUp, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjectBudget, useUpdateProjectBudget, useProjectMembers } from "@/hooks/api/projects";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { getErrorMessage } from "@/lib/get-error-message";

type MemberBreakdownRow = { userId: string; hours: number; cost: number };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: budget, isLoading } = useProjectBudget(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateBudget = useUpdateProjectBudget(projectId);

  const [editMode, setEditMode] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  function handleOpenEdit() {
    setNewBudget(String(budget?.plannedBudget ?? ""));
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
  }

  function handleBudgetInputChange(e: ChangeEvent<HTMLInputElement>) {
    setNewBudget(e.target.value);
  }

  function handleSaveBudget() {
    const val = Number(newBudget);
    if (!Number.isFinite(val) || val < 0) return;
    updateBudget.mutate(val, {
      onSuccess: () => { toast.success("Budget updated"); setEditMode(false); },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function resolveMemberUser(userId: string) {
    return members?.find((m) => m.id === userId) ?? null;
  }

  const memberColumns = useMemo((): DataTableColumn<MemberBreakdownRow>[] => [
    {
      key: "member",
      header: "Member",
      cell: (row) => {
        const user = resolveMemberUser(row.userId);
        const displayName = user ? getUserDisplayName(user) : row.userId.substring(0, 8) + "…";
        const initials = user ? getUserInitials(user) : "?";
        const email = user?.email ?? null;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={resolveImageUrl(user?.image)} />
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>{displayName}</p>
              {email ? (
                <p className={cn("text-[11px] text-muted-foreground", TEXT_ONE_LINE)}>{email}</p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      key: "hours",
      header: "Hours",
      className: "text-right w-[120px]",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-mono text-sm text-muted-foreground whitespace-nowrap">
          {row.hours.toFixed(1)} hrs
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      className: "text-right w-[120px]",
      headerClassName: "text-right",
      cell: (row) => (
        <span className="font-mono text-sm font-medium whitespace-nowrap">{fmt(row.cost)}</span>
      ),
    },
  ], [members]);

  const budgetActions = editMode ? (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        aria-label="Planned budget in rupees"
        className="h-8 text-sm w-36"
        value={newBudget}
        onChange={handleBudgetInputChange}
        placeholder={String(budget?.plannedBudget ?? "")}
      />
      <LoadingButton
        size="sm"
        onClick={handleSaveBudget}
        isPending={updateBudget.isPending}
        loadingText="Saving…"
      >
        Save
      </LoadingButton>
      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
        Cancel
      </Button>
    </div>
  ) : (
    <Button size="sm" variant="outline" onClick={handleOpenEdit}>
      <Pencil className="h-4 w-4 mr-1" />
      {budget?.plannedBudget ? "Update Budget" : "Set Budget"}
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Budget"
        subtitle="Planned budget vs actual cost from billable timesheets"
        actions={<Skeleton className="h-8 w-32 rounded-md" />}
      >
        <PmPageShell>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-20 rounded-xl" />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const overBudget = (budget?.remaining ?? 0) < 0;

  return (
    <PageWrapper
      title="Budget"
      subtitle="Planned budget vs actual cost from billable timesheets"
      actions={budgetActions}
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Planned Budget"
              value={fmt(budget?.plannedBudget ?? 0)}
              icon={IndianRupee}
              hint={budget?.plannedBudget ? "Project budget" : "Not set"}
              color="blue"
              index={0}
            />
            <StatCard
              label="Actual Cost"
              value={fmt(budget?.actualCost ?? 0)}
              icon={TrendingUp}
              hint={`${(budget?.totalHours ?? 0).toFixed(1)} billable hours`}
              color={overBudget ? "red" : "cyan"}
              index={1}
            />
            <StatCard
              label="Remaining"
              value={fmt(Math.abs(budget?.remaining ?? 0))}
              icon={IndianRupee}
              hint={overBudget ? "Over budget" : "Available"}
              color={overBudget ? "red" : "green"}
              index={2}
            />
          </div>
        </PmSection>

        {(budget?.plannedBudget ?? 0) > 0 ? (
          <PmSection index={1}>
            <PmPanel className="p-4">
              <h3 className={cn("mb-3 text-sm font-semibold", TEXT_ONE_LINE)}>
                Budget Utilization
              </h3>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{budget?.utilizationPct ?? 0}% used</span>
                <span>{fmt(budget?.plannedBudget ?? 0)} planned</span>
              </div>
              <Progress
                value={Math.min(budget?.utilizationPct ?? 0, 100)}
                className={overBudget ? "h-2 [&>div]:bg-red-500" : "h-2 [&>div]:bg-primary"}
              />
            </PmPanel>
          </PmSection>
        ) : null}

        {budget?.memberBreakdown && budget.memberBreakdown.length > 0 ? (
          <PmSection index={2}>
            <PmPanel solid>
              <div className="border-b border-border/60 px-4 py-3">
                <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                  Member Cost Breakdown
                </h3>
              </div>
              <DataTable
                data={budget.memberBreakdown}
                columns={memberColumns}
                getRowKey={(row) => row.userId}
                className="rounded-none border-0"
              />
            </PmPanel>
          </PmSection>
        ) : null}

        {(budget?.memberBreakdown?.length ?? 0) === 0 && !isLoading ? (
          <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="calendar"
              title="No billable time logged"
              description="Log billable hours to track costs against this project's budget."
            />
        ) : null}
      </PmPageShell>
    </PageWrapper>
  );
}
