"use client";

import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";
import { SalaryProfileSheet } from "@/features/payroll/runs/salary-profile-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import {
  useWorkerProfile,
  useWorkerProfileHistory,
} from "@/hooks/api/payroll/employees";
import { useCan } from "@/hooks/api/access";
import type { EmployeeSalaryProfile } from "@/types/payroll/runs";
import { ComponentsBreakdown } from "./salary-component-breakdown";
import { SalaryProfileStatusBadge } from "./salary-profile-status-badge";
import { EmployeeDetailPage } from "./employee-detail-page";

function ProfileHistoryRow({ profile }: { profile: EmployeeSalaryProfile }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-t border-border first:border-0 text-dense">
      <span className="font-mono tabular-nums text-muted-foreground shrink-0">
        {profile.effectiveFrom}
      </span>
      <span className="flex-1 font-medium">{formatMoney(profile.annualCtc)} / year</span>
      <SalaryProfileStatusBadge status={profile.status} />
    </div>
  );
}

interface WorkerDetailPageProps {
  workerId: string;
}

export function WorkerDetailPage({ workerId }: WorkerDetailPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const canView = useCan("payroll:salaries:view");
  const canUpdate = useCan("payroll:salaries:update");
  const {
    data: profileData,
    isLoading,
    isError,
    error,
    refetch,
  } = useWorkerProfile(workerId);
  const { data: historyData } = useWorkerProfileHistory(workerId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const linkedUserId = profileData?.active?.userId ?? null;
  if (linkedUserId) {
    return <EmployeeDetailPage employeeUserId={linkedUserId} />;
  }

  const activeProfile = profileData?.active ?? null;
  const components = profileData?.components ?? [];
  const history = historyData ?? [];
  const upcomingProfiles = history.filter((p) => p.status === "UPCOMING");
  const supersededProfiles = history.filter((p) => p.status === "SUPERSEDED");

  function handleEditOpen() {
    setSheetOpen(true);
  }

  function handleEditClose() {
    setSheetOpen(false);
  }

  if (!canView) {
    return (
      <PageWrapper title="Salary Profile" backHref="/payroll/employees">
        <EmptyState
          title="Access Denied"
          description="You don't have permission to view salary profiles."
          compact
        />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Salary Profile" backHref="/payroll/employees">
        <div className="space-y-4">
          <StatCardGridSkeleton cols={3} count={3} />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Salary Profile" backHref="/payroll/employees">
        <ErrorState
          className="flex-1"
          title="Couldn't load this salary profile"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const payeeName = activeProfile?.userName ?? "Worker payee";

  return (
    <PageWrapper
      title={payeeName}
      backHref="/payroll/employees"
      subtitle={
        activeProfile ? (
          <span className="flex items-center gap-2">
            <span>{formatMoney(activeProfile.annualCtc)} / year</span>
            <SalaryProfileStatusBadge status={activeProfile.status} />
          </span>
        ) : "No active salary profile"
      }
      actions={
        canUpdate ? (
          <Button size="sm" onClick={handleEditOpen}>
            {activeProfile ? "Edit profile" : "Create profile"}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {activeProfile && (
          <>
            <StatCardGrid cols={3}>
              <StatCard label="Annual CTC" value={formatMoney(activeProfile.annualCtc)} tone="blue" icon={DollarSign} />
              <StatCard label="Currency" value={activeProfile.currency} />
              <StatCard label="Worker Type" value={activeProfile.workerType} />
            </StatCardGrid>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Salary Components</h3>
              <ComponentsBreakdown components={components} />
            </div>
          </>
        )}

        {!activeProfile && (
          <EmptyState
            title="No active salary profile"
            description="Create a salary profile to include this worker in payroll runs"
            action={canUpdate ? { label: "Create profile", onClick: handleEditOpen } : undefined}
          />
        )}

        {upcomingProfiles.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Upcoming Changes</h3>
            {upcomingProfiles.map((profile) => (
              <ProfileHistoryRow key={profile.id} profile={profile} />
            ))}
          </div>
        )}

        {supersededProfiles.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">History</h3>
            {supersededProfiles.map((profile) => (
              <ProfileHistoryRow key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>

      <SalaryProfileSheet
        workerId={workerId}
        open={sheetOpen}
        onClose={handleEditClose}
        existingProfile={activeProfile}
      />
    </PageWrapper>
  );
}
