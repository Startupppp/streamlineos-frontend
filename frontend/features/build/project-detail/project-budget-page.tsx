"use client";

import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, TrendingUp, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import {
  useProjectBudget,
  useUpdateProjectBudget,
} from "@/hooks/api/build/milestones";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { usePageState } from "@/hooks/api/use-page-state";
import type { NamedUser } from "@/lib/person-display";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoneyCompact, formatINRCompact, formatINR, formatMoney } from "@/lib/format-utils";
import { useSubmitGuard } from "@/hooks/common/use-submit-guard";
import { budgetFormSchema } from "@/lib/validation/projects";
import {
  useMemberCostColumns,
  type MemberBreakdownRow,
} from "./use-member-cost-columns";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { ProjectTimeBudgetSection } from "./project-time-budget-section";

interface ProjectBudgetPageProps {
  projectId: string;
}

export function ProjectBudgetPage({
  projectId: projectIdStr,
}: ProjectBudgetPageProps) {
  const projectId = Number(projectIdStr);
  const display = useOrgDisplay();
  const {
    data: budget,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectBudget(projectId);
  const pageState = usePageState({
    permission: "build:manage",
    isLoading,
    isError,
    error,
    isEmpty: !budget,
  });
  const { data: membersPage } = useProjectMembers(projectId);
  const members = useMemo(() => membersPage?.data ?? [], [membersPage]);
  const { data: buildMembersData } = useBuildMembers({ limit: 200 });
  const updateBudget = useUpdateProjectBudget(projectId);

  const buildMemberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of buildMembersData?.data ?? []) {
      map.set(member.id, { name: member.name, email: member.email });
    }
    return map;
  }, [buildMembersData]);

  const resolveMemberUser = useCallback(
    (userId: string): NamedUser | null => {
      const projectMember = members?.find((m) => m.id === userId);
      if (projectMember) return projectMember;
      return buildMemberById.get(userId) ?? null;
    },
    [members, buildMemberById],
  );

  const resolveMemberImage = useCallback(
    (userId: string) => members?.find((m) => m.id === userId)?.image,
    [members],
  );

  const [editMode, setEditMode] = useState(false);

  const budgetForm = useForm<z.input<typeof budgetFormSchema>, unknown, z.output<typeof budgetFormSchema>>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: { budget: "" },
  });

  useRegisterDirtyState(editMode && budgetForm.formState.isDirty);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function handleOpenEdit() {
    budgetForm.reset({ budget: budget?.plannedBudget != null ? String(budget.plannedBudget) : "" });
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
    budgetForm.reset({ budget: "" });
  }

  const handleSaveBudgetInner = useCallback(async () => {
    await budgetForm.handleSubmit(async (data) => {
      try {
        await updateBudget.mutateAsync(data.budget);
        toast.success("Budget updated");
        setEditMode(false);
        budgetForm.reset({ budget: "" });
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    })();
  }, [budgetForm, updateBudget, setEditMode]);

  const budgetSaveGuard = useSubmitGuard(handleSaveBudgetInner);

  const formatBudget = useCallback((value: number | null | undefined): string => {
    const v = value ?? 0;
    if (!display || display.currency === "INR") return formatINRCompact(v);
    return formatMoneyCompact(v, display);
  }, [display]);

  const formatBudgetFull = useCallback((value: number | null | undefined): string => {
    const v = value ?? 0;
    if (!display || display.currency === "INR") return formatINR(v);
    return formatMoney(v, display);
  }, [display]);

  const memberColumns = useMemberCostColumns({
    resolveMemberUser,
    resolveMemberImage,
  });

  const renderMemberMobileCard = useCallback(
    (row: MemberBreakdownRow) => {
      const user = resolveMemberUser(row.userId);
      return (
        <BuildMobileCard
          title={user ? (user.name ?? user.email ?? row.userId) : row.userId}
          meta={[
            { label: "Hours", value: `${row.hours.toFixed(1)} hrs` },
            { label: "Cost", value: formatBudget(row.cost) },
          ]}
        />
      );
    },
    [resolveMemberUser, formatBudget],
  );

  const budgetActions = editMode ? (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          aria-label="Planned budget"
          className="text-sm w-36"
          placeholder={budget?.plannedBudget != null ? String(budget.plannedBudget) : "0"}
          {...budgetForm.register("budget")}
        />
        <LoadingButton
          size="sm"
          onClick={() => void budgetSaveGuard.submit()}
          isPending={budgetSaveGuard.isSubmitting}
          loadingText="Saving…"
        >
          Save
        </LoadingButton>
        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
          Cancel
        </Button>
      </div>
      {budgetForm.formState.errors.budget ? (
        <p className="text-xs text-destructive">{budgetForm.formState.errors.budget.message}</p>
      ) : null}
    </div>
  ) : (
    <Button size="sm" variant="outline" onClick={handleOpenEdit}>
      <Pencil className="h-4 w-4 mr-1" />
      {budget?.plannedBudget ? "Update Budget" : "Set Budget"}
    </Button>
  );

  const overBudget = (budget?.remaining ?? 0) < 0;
  const uncostedHours =
    (budget?.unratedHours ?? 0) + (budget?.excludedCurrencyHours ?? 0);
  const billableHoursLabel = `${(budget?.totalHours ?? 0).toFixed(1)} billable hours`;

  return (
    <PageWrapper
      title="Budget"
      subtitle="Planned budget vs actual cost from billable timesheets"
      actions={
        pageState.kind === "loading" ? (
          <Skeleton className="h-8 w-32 rounded-md" />
        ) : (
          budgetActions
        )
      }
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          className={CONTENT_FILL_PANEL}
          onRetry={handleRetry}
          loading={
            <>
              <StatCardGridSkeleton cols={3} className="mb-4" />
              <Skeleton className="h-20 rounded-xl border border-border bg-card" />
            </>
          }
          empty={
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="expenses"
              title="No budget data"
              description="Budget details are unavailable for this project."
            />
          }
        >
          <PmSection index={0}>
            <StatCardGrid cols={3}>
              <div title={formatBudgetFull(budget?.plannedBudget ?? 0)}>
                <StatCard
                  label="Planned Budget"
                  value={formatBudget(budget?.plannedBudget ?? 0)}
                  icon={IndianRupee}
                  hint={budget?.plannedBudget ? "Project budget" : "Not set"}
                  tone="default"
                />
              </div>
              <StatCard
                label="Actual Cost"
                value={formatBudget(budget?.actualCost ?? 0)}
                icon={TrendingUp}
                hint={
                  uncostedHours > 0
                    ? `${billableHoursLabel} · ${uncostedHours.toFixed(1)} not yet costed`
                    : billableHoursLabel
                }
                tone={overBudget ? "red" : "default"}
              />
              <div title={formatBudgetFull(Math.abs(budget?.remaining ?? 0))}>
                <StatCard
                  label="Remaining"
                  value={formatBudget(Math.abs(budget?.remaining ?? 0))}
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
              </div>
            </StatCardGrid>
          </PmSection>

          {(budget?.plannedBudget ?? 0) > 0 ? (
            <PmSection index={1}>
              <PmPanel className="p-4">
                <h3 className={cn("mb-3 text-sm font-medium", TEXT_ONE_LINE)}>
                  Budget Utilization
                </h3>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{budget?.utilizationPct ?? 0}% used</span>
                  <span>
                    {formatBudget(budget?.plannedBudget ?? 0)}{" "}
                    planned
                  </span>
                </div>
                <Progress
                  value={Math.min(budget?.utilizationPct ?? 0, 100)}
                  className={
                    overBudget
                      ? "h-2 [&>div]:bg-status-danger-fill"
                      : "h-2 [&>div]:bg-primary"
                  }
                />
              </PmPanel>
            </PmSection>
          ) : null}

          {budget?.memberBreakdown && budget.memberBreakdown.length > 0 ? (
            <PmSection index={2}>
              <PmPanel solid>
                <div className="border-b border-border/60 px-4 py-3">
                  <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
                    Member Cost Breakdown
                  </h3>
                </div>
                <DataTable
                  data={budget.memberBreakdown}
                  columns={memberColumns}
                  getRowKey={(row) => row.userId}
                  className="rounded-none border-0"
                  mobileCard={renderMemberMobileCard}
                />
              </PmPanel>
            </PmSection>
          ) : null}

          {(budget?.memberBreakdown?.length ?? 0) === 0 && !isLoading ? (
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="expenses"
              title="No billable time logged"
              description="Log billable hours to track costs against this project's budget."
            />
          ) : null}
        </PageState>

        <ProjectTimeBudgetSection projectId={projectId} />
      </PmPageShell>
    </PageWrapper>
  );
}
