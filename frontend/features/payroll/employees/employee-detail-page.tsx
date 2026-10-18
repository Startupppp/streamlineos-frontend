"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NotFoundView } from "@/components/shared/page-state-views";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, DollarSign } from "lucide-react";
import { SalaryProfileSheet } from "@/features/payroll/runs/salary-profile-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import {
  useEmployeeProfile,
  useEmployeeProfileHistory,
} from "@/hooks/api/payroll/employees";
import { useCan } from "@/hooks/api/access";
import { ComponentsBreakdown } from "./salary-component-breakdown";
import type {
  ProfileDetail,
  SalaryProfileStatus,
  ProfileComponent,
} from "@/hooks/api/payroll/employees-schema";
import { cn } from "@/lib/utils";
import { useSalaryPreview } from "@/hooks/api/payroll/salary-preview";
import { isPolicyNotActiveError, PolicyNotActiveNotice } from "@/features/payroll/salary-structures/salary-breakup-preview";

const STATUS_CONFIG: Record<SalaryProfileStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-status-success-surface text-status-success-ink border-status-success-rule", label: "Active" },
  UPCOMING: { className: "bg-primary/10 text-foreground border-primary/20", label: "Upcoming" },
  SUPERSEDED: { className: "bg-muted text-muted-foreground border-border", label: "Superseded" },
};

function ProfileEstimate({ profile, components }: { profile: ProfileDetail; components: ProfileComponent[] }) {
  const componentIds = useMemo(() => components.map((c) => c.componentId), [components]);
  const { data, isLoading, isError, error } = useSalaryPreview(
    {
      annualCtc: profile.annualCtc,
      workerType: profile.workerType,
      regime: profile.taxRegime ?? undefined,
      componentIds,
    },
    { enabled: componentIds.length > 0 },
  );

  if (componentIds.length === 0) {
    return (
      <p className="text-dense text-muted-foreground">
        No salary components are assigned, so a payroll run will stop on this profile. Edit the profile to assign components.
      </p>
    );
  }
  if (isLoading) return <StatCardGridSkeleton cols={2} count={2} />;
  if (isError && isPolicyNotActiveError(error)) return <PolicyNotActiveNotice />;
  if (isError || !data) {
    return <p className="text-dense text-muted-foreground">Estimate unavailable: {getErrorMessage(error)}</p>;
  }
  return (
    <div className="space-y-2">
      <StatCardGrid cols={2}>
        <StatCard
          label="Est. Monthly Gross"
          value={formatMoney(data.monthly.gross, profile.currency)}
          hint="Payroll engine, full-attendance month"
        />
        <StatCard
          label="Est. Monthly Net"
          value={formatMoney(data.monthly.net, profile.currency)}
          hint={`After ${formatMoney(data.monthly.deductions, profile.currency)} deductions`}
          tone="emerald"
        />
      </StatCardGrid>
      {data.warnings.map((warning) => (
        <p key={warning} className="text-dense text-destructive">{warning}</p>
      ))}
    </div>
  );
}

function ProfileHistoryRow({ profile }: { profile: ProfileDetail }) {
  const cfg = STATUS_CONFIG[profile.status];
  return (
    <div className="flex items-center gap-3 py-1.5 border-t border-border first:border-0 text-dense">
      <span className="font-mono tabular-nums text-muted-foreground shrink-0">
        {profile.effectiveFrom}
      </span>
      <span className="flex-1 font-medium">{formatMoney(profile.annualCtc)} / year</span>
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border",
          cfg.className,
        )}
      >
        {cfg.label}
      </span>
    </div>
  );
}

interface EmployeeDetailPageProps {
  employeeUserId: string;
}

export function EmployeeDetailPage({ employeeUserId }: EmployeeDetailPageProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const canView = useCan("payroll:salaries:view");
  const canUpdate = useCan("payroll:salaries:update");
  const {
    data: profileData,
    isLoading,
    isError,
    error,
    refetch,
  } = useEmployeeProfile(employeeUserId);
  const { data: historyData } = useEmployeeProfileHistory(employeeUserId);

  const activeProfile = profileData?.active ?? null;
  const employeeName = profileData?.employee.name ?? profileData?.employee.email ?? null;
  const components = useMemo(() => profileData?.components ?? [], [profileData]);
  const history = historyData ?? [];
  const upcomingProfiles = history.filter((p) => p.status === "UPCOMING");
  const supersededProfiles = history.filter((p) => p.status === "SUPERSEDED");

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

  if (isError && isApiError(error) && error.status === 404) {
    return (
      <PageWrapper title="Not found" backHref="/payroll/employees">
        <NotFoundView
          title="Employee not found"
          description="This salary profile does not exist or you don't have access to it."
          action={
            <Button asChild variant="outline" className="gap-2">
              <Link href="/payroll/employees">
                <ArrowLeft className="h-4 w-4" />
                Back to employees
              </Link>
            </Button>
          }
        />
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

  return (
    <PageWrapper
      title="Salary Profile"
      backHref="/payroll/employees"
      subtitle={
        activeProfile ? (
          <span className="flex items-center gap-2">
            {employeeName ? <span>{employeeName}</span> : null}
            <span>{formatMoney(activeProfile.annualCtc)} / year</span>
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border",
                STATUS_CONFIG[activeProfile.status].className,
              )}
            >
              {STATUS_CONFIG[activeProfile.status].label}
            </span>
          </span>
        ) : employeeName ? (
          <span>{employeeName} — no active salary profile</span>
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
              <StatCard
                label="Annual CTC"
                value={formatMoney(activeProfile.annualCtc)}
                tone="blue"
                icon={DollarSign}
              />
              <StatCard
                label="Currency"
                value={activeProfile.currency}
              />
              <StatCard
                label="Worker Type"
                value={activeProfile.workerType}
              />
            </StatCardGrid>

            <ProfileEstimate profile={activeProfile} components={components} />

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Profile Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wider font-bold">Effective From</p>
                  <p className="text-label font-mono tabular-nums mt-0.5">{activeProfile.effectiveFrom}</p>
                </div>
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wider font-bold">Tax Regime</p>
                  <p className="text-label mt-0.5">{activeProfile.taxRegime ?? "Not specified"}</p>
                </div>
                <div>
                  <p className="text-micro text-muted-foreground uppercase tracking-wider font-bold">Cost Center</p>
                  <p className="text-label mt-0.5">{activeProfile.costCenter ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Salary Components</h3>
              <ComponentsBreakdown components={components} />
            </div>
          </>
        )}

        {!activeProfile && (
          <EmptyState
            title="No active salary profile"
            description="Create a salary profile to include this employee in payroll runs"
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

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Payslip History</h3>
            <Link
              href={`/payroll/payslips?employee=${employeeUserId}`}
              className="text-dense text-primary hover:underline"
            >
              View payslips
            </Link>
          </div>
          <p className="text-dense text-muted-foreground mt-1">
            Payslips are generated after each payroll run is published.
          </p>
        </div>
      </div>

      <SalaryProfileSheet
        employeeUserId={employeeUserId}
        open={sheetOpen}
        onClose={handleEditClose}
        existingProfile={activeProfile}
        existingComponents={components}
      />
    </PageWrapper>
  );
}
