"use client";

import { use, useState, useMemo, useCallback, memo, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IndianRupee, TrendingUp, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjectBudget, useUpdateProjectBudget, useProjectMembers } from "@/hooks/api/build";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName, getUserInitials, type NamedUser } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/build/shared/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";

type MemberBreakdownRow = { userId: string; hours: number; cost: number };

const MemberBreakdownCell = memo(function MemberBreakdownCell({
  displayName,
  initials,
  email,
  image,
}: {
  displayName: string;
  initials: string;
  email: string | null;
  image?: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={resolveImageUrl(image)} />
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <TruncatedText text={displayName} className="text-sm font-medium" />
        {email ? (
          <TruncatedText text={email} className="text-[11px] text-muted-foreground" />
        ) : null}
      </div>
    </div>
  );
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: budget, isLoading } = useProjectBudget(projectId);
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

  const memberColumns = useMemo((): DataTableColumn<MemberBreakdownRow>[] => [
    {
      key: "member",
      header: "Member",
      cell: (row) => {
        const user = resolveMemberUser(row.userId);
        return (
          <MemberBreakdownCell
            displayName={user ? getUserDisplayName(user) : "Unknown"}
            initials={user ? getUserInitials(user) : "?"}
            email={user?.email ?? null}
            image={resolveMemberImage(row.userId)}
          />
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
  ], [resolveMemberUser, resolveMemberImage]);

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

  if (isLoading) {
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

  const overBudget = (budget?.remaining ?? 0) < 0;

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
              value={fmt(budget?.plannedBudget ?? 0)}
              icon={IndianRupee}
              hint={budget?.plannedBudget ? "Project budget" : "Not set"}
              tone="default"
            />
            <StatCard
              label="Actual Cost"
              value={fmt(budget?.actualCost ?? 0)}
              icon={TrendingUp}
              hint={`${(budget?.totalHours ?? 0).toFixed(1)} billable hours`}
              tone={overBudget ? "red" : "default"}
            />
            <StatCard
              label="Remaining"
              value={fmt(Math.abs(budget?.remaining ?? 0))}
              icon={IndianRupee}
              hint={overBudget ? "Over budget" : "Available"}
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
