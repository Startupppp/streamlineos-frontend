"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";
import { SalaryProfileSheet } from "@/features/payroll/runs/salary-profile-sheet";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import {
  useEmployeeProfile,
  useEmployeeProfileHistory,
} from "@/hooks/api/payroll/employees";
import { useCan } from "@/hooks/api/access";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type {
  EmployeeSalaryProfile,
  SalaryProfileStatus,
  ProfileComponent,
  SalaryComponentType,
} from "@/types/payroll/runs";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<SalaryProfileStatus, { className: string; label: string }> = {
  ACTIVE: { className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30", label: "Active" },
  UPCOMING: { className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30", label: "Upcoming" },
  SUPERSEDED: { className: "bg-muted text-muted-foreground border-border", label: "Superseded" },
};

const COMPONENT_TYPE_LABELS: Record<SalaryComponentType, string> = {
  EARNING: "Earnings",
  DEDUCTION: "Deductions",
  EMPLOYER_CONTRIBUTION: "Employer Contributions",
  REIMBURSEMENT: "Reimbursements",
  TAX: "Tax",
  ADJUSTMENT: "Adjustments",
};

const COMPONENT_TYPE_ORDER: SalaryComponentType[] = [
  "EARNING",
  "DEDUCTION",
  "EMPLOYER_CONTRIBUTION",
  "REIMBURSEMENT",
  "TAX",
  "ADJUSTMENT",
];

const COMPONENT_COLUMNS: DataTableColumn<ProfileComponent>[] = [
  {
    key: "name",
    header: "Component",
    cell: (comp) => (
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{comp.name}</span>
          {comp.isOverride && (
            <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-700 border border-amber-200 font-medium dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
              override
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{comp.code}</span>
      </div>
    ),
    className: "w-[40%] py-1 pr-2",
  },
  {
    key: "calcMethod",
    header: "Method",
    cell: (comp) => <span className="text-muted-foreground">{comp.calcMethod}</span>,
    className: "w-[20%] py-1 pr-2",
  },
  {
    key: "amount",
    header: "Amount",
    cell: (comp) => (
      <span className="font-mono tabular-nums">
        {comp.amount !== null ? formatMoney(comp.amount) : "—"}
      </span>
    ),
    className: "w-[20%] py-1 pr-2 text-right",
    headerClassName: "text-right",
  },
  {
    key: "percent",
    header: "Percent",
    cell: (comp) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {comp.percent !== null ? `${comp.percent}%` : "—"}
      </span>
    ),
    className: "w-[20%] py-1 text-right",
    headerClassName: "text-right",
  },
];

function ComponentsBreakdown({ components }: { components: ProfileComponent[] }) {
  const grouped = useMemo(
    () =>
      COMPONENT_TYPE_ORDER.reduce<Record<SalaryComponentType, ProfileComponent[]>>(
        (acc, type) => {
          acc[type] = components.filter((c) => c.type === type);
          return acc;
        },
        { EARNING: [], DEDUCTION: [], EMPLOYER_CONTRIBUTION: [], REIMBURSEMENT: [], TAX: [], ADJUSTMENT: [] },
      ),
    [components],
  );

  if (components.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">No components configured for this profile.</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {COMPONENT_TYPE_ORDER.filter((type) => grouped[type].length > 0).map((type) => (
        <div key={type} className="pt-3 first:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {COMPONENT_TYPE_LABELS[type]}
          </p>
          <DataTable
            data={grouped[type]}
            columns={COMPONENT_COLUMNS}
            getRowKey={(comp) => comp.id}
            className="border-0 rounded-none text-[11px]"
          />
        </div>
      ))}
    </div>
  );
}

function ProfileHistoryRow({ profile }: { profile: EmployeeSalaryProfile }) {
  const cfg = STATUS_CONFIG[profile.status];
  return (
    <div className="flex items-center gap-3 py-1.5 border-t border-border first:border-0 text-[11px]">
      <span className="font-mono tabular-nums text-muted-foreground shrink-0">
        {profile.effectiveFrom}
      </span>
      <span className="flex-1 font-medium">{formatMoney(profile.annualCtc)} / year</span>
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
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
  const { data: profileData, isLoading } = useEmployeeProfile(employeeUserId);
  const { data: historyData } = useEmployeeProfileHistory(employeeUserId);

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  const userName = activeProfile?.userName ?? employeeUserId;

  return (
    <PageWrapper
      title={userName}
      eyebrow="Payroll / Employees"
      backHref="/payroll/employees"
      subtitle={
        activeProfile ? (
          <span className="flex items-center gap-2">
            <span>{formatMoney(activeProfile.annualCtc)} / year</span>
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
                STATUS_CONFIG[activeProfile.status].className,
              )}
            >
              {STATUS_CONFIG[activeProfile.status].label}
            </span>
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

            {(() => {
              const earningSum = components
                .filter((c) => c.type === "EARNING" && c.amount !== null)
                .reduce((acc, c) => acc + parseFloat(c.amount ?? "0"), 0);
              const deductionSum = components
                .filter((c) => c.type === "DEDUCTION" && c.amount !== null)
                .reduce((acc, c) => acc + parseFloat(c.amount ?? "0"), 0);
              const monthlyGross =
                earningSum > 0 ? earningSum : parseFloat(activeProfile.annualCtc) / 12;
              const estimatedNet = monthlyGross - deductionSum;
              return (
                <StatCardGrid cols={2}>
                  <StatCard
                    label="Est. Monthly Gross"
                    value={formatMoney(monthlyGross.toFixed(2), activeProfile.currency)}
                    hint={earningSum === 0 ? "Derived from annual CTC" : undefined}
                  />
                  <StatCard
                    label="Est. Monthly Net"
                    value={formatMoney(estimatedNet.toFixed(2), activeProfile.currency)}
                    hint={deductionSum > 0 ? `After ${formatMoney(deductionSum.toFixed(2), activeProfile.currency)} deductions` : undefined}
                    tone="emerald"
                  />
                </StatCardGrid>
              );
            })()}

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Profile Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Effective From</p>
                  <p className="text-[13px] font-mono tabular-nums mt-0.5">{activeProfile.effectiveFrom}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Tax Regime</p>
                  <p className="text-[13px] mt-0.5">{activeProfile.taxRegime ?? "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Cost Center</p>
                  <p className="text-[13px] mt-0.5">{activeProfile.costCenter ?? "—"}</p>
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
              className="text-[11px] text-primary hover:underline"
            >
              View payslips
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Payslips are generated after each payroll run is published.
          </p>
        </div>
      </div>

      <SalaryProfileSheet
        employeeUserId={employeeUserId}
        open={sheetOpen}
        onClose={handleEditClose}
        existingProfile={activeProfile}
      />
    </PageWrapper>
  );
}
