"use client";

import { useState, useMemo, useCallback, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, TrendingUp, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useProjectBudget, useUpdateProjectBudget, useProjectMembers } from "@/hooks/api/build";
import { useOrgMembers } from "@/hooks/api/organization";
import { useCanState } from "@/hooks/api/access";
import { resolveGate } from "@/lib/rbac/gate";
import type { NamedUser } from "@/lib/person-display";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoneyCompact } from "@/lib/format-utils";
import { useMemberCostColumns } from "./use-member-cost-columns";

interface ProjectBudgetPageProps {
  projectId: string;
}

export function ProjectBudgetPage({ projectId: projectIdStr }: ProjectBudgetPageProps) {
  const projectId = Number(projectIdStr);
  const display = useOrgDisplay();
  const access = useCanState("build:manage");
  const {
    data: budget,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectBudget(projectId);
  const gate = resolveGate({
    access,
    isLoading,
    isError,
    isEmpty: !budget,
  });
  const { data: members } = useProjectMembers(projectId);
  const { data: orgMembersData } = useOrgMembers(1, 200);
  const updateBudget = useUpdateProjectBudget(projectId);

  const orgMemberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of orgMembersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [orgMembersData]);

  const resolveMemberUser = useCallback(
    (userId: string): NamedUser | null => {
      const projectMember = members?.find((m) => m.id === userId);
      if (projectMember) return projectMember;
      return orgMemberById.get(userId) ?? null;
    },
    [members, orgMemberById],
  );

  const resolveMemberImage = useCallback(
    (userId: string) => members?.find((m) => m.id === userId)?.image,
    [members],
  );

  const [editMode, setEditMode] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

  const memberColumns = useMemberCostColumns({ resolveMemberUser, resolveMemberImage });

  const budgetActions = editMode ? (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        aria-label="Planned budget in rupees"
        className="text-sm w-36"
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

  if (gate === "loading") {
    return (
      <PageWrapper
        title="Budget"
        subtitle="Planned budget vs actual cost from billable timesheets"
        actions={<Skeleton className="h-8 w-32 rounded-md" />}
      >
        <PmPageShell>
          <StatCardGridSkeleton cols={3} className="mb-4" />
          <Skeleton className="h-20 rounded-xl border border-border bg-card" />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (gate === "denied") {
    return (
      <PageWrapper
        title="Budget"
        subtitle="Planned budget vs actual cost from billable timesheets"
      >
        <PmPageShell>
          <NoPermissionState permission="build:manage" className={PM_FILL_PANEL} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (gate === "error") {
    return (
      <PageWrapper
        title="Budget"
        subtitle="Planned budget vs actual cost from billable timesheets"
      >
        <PmPageShell>
          <ErrorState
            className="flex-1"
            title="Couldn't load budget"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (gate === "empty" || !budget) {
    return (
      <PageWrapper
        title="Budget"
        subtitle="Planned budget vs actual cost from billable timesheets"
      >
        <PmPageShell>
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="calendar"
            title="No budget data"
            description="Budget details are unavailable for this project."
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const overBudget = budget.remaining < 0;
  // Hours the API could not put a price on: no rate was stamped on the entry, or
  // the entry was rated in a currency other than the budget's. Actual Cost omits
  // them, so saying only "under budget" beside them would understate the spend.
  const uncostedHours =
    (budget?.unratedHours ?? 0) + (budget?.excludedCurrencyHours ?? 0);
  const billableHoursLabel = `${(budget?.totalHours ?? 0).toFixed(1)} billable hours`;

  return (
    <PageWrapper
      title="Budget"
      subtitle="Planned budget vs actual cost from billable timesheets"
      actions={budgetActions}
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGrid cols={3}>
            <StatCard
              label="Planned Budget"
              value={formatMoneyCompact(budget?.plannedBudget ?? 0, display)}
              icon={IndianRupee}
              hint={budget?.plannedBudget ? "Project budget" : "Not set"}
              tone="default"
            />
            <StatCard
              label="Actual Cost"
              value={formatMoneyCompact(budget?.actualCost ?? 0, display)}
              icon={TrendingUp}
              hint={
                uncostedHours > 0
                  ? `${billableHoursLabel} · ${uncostedHours.toFixed(1)} not yet costed`
                  : billableHoursLabel
              }
              tone={overBudget ? "red" : "default"}
            />
            <StatCard
              label="Remaining"
              value={formatMoneyCompact(Math.abs(budget?.remaining ?? 0), display)}
              icon={IndianRupee}
              hint={
                overBudget
                  ? "Over budget"
                  : uncostedHours > 0
                    ? "Before uncosted hours"
                    : "Available"
              }
              tone={overBudget ? "red" : "emerald"}
            />
          </StatCardGrid>
        </PmSection>

        {(budget?.plannedBudget ?? 0) > 0 ? (
          <PmSection index={1}>
            <PmPanel className="p-4">
              <h3 className={cn("mb-3 text-sm font-semibold", TEXT_ONE_LINE)}>
                Budget Utilization
              </h3>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{budget?.utilizationPct ?? 0}% used</span>
                <span>{formatMoneyCompact(budget?.plannedBudget ?? 0, display)} planned</span>
              </div>
              <Progress
                value={Math.min(budget?.utilizationPct ?? 0, 100)}
                className={overBudget ? "h-2 [&>div]:bg-status-danger-fill" : "h-2 [&>div]:bg-primary"}
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
