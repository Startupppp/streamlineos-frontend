"use client";

import { useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Users, AlertTriangle, Info } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useManagerInbox,
  useManagerTeamRewards,
  useManagerApproveReimbursement,
  useManagerRejectReimbursement,
  useManagerApproveLoan,
  useManagerRejectLoan,
} from "@/hooks/api/payroll/ess";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  ManagerTeamMember,
  ManagerPendingReimbursement,
  ManagerPendingLoan,
  TeamRewardsMember,
} from "@/types/payroll/ess";

const MEMBER_COLUMNS: DataTableColumn<ManagerTeamMember>[] = [
  {
    key: "name",
    header: "Team member",
    cell: (row) => (
      <div className="min-w-0">
        <p className="text-label font-medium text-foreground truncate">
          {row.name ?? row.email ?? "Unknown user"}
        </p>
        {row.email && (
          <p className="text-dense text-muted-foreground truncate">{row.email}</p>
        )}
      </div>
    ),
  },
  {
    key: "latestPayslip",
    header: "Latest payslip",
    cell: (row) =>
      row.latestPayslip ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatMonth(row.latestPayslip.month)} · {formatMoney(row.latestPayslip.net)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "pendingReimbursements",
    header: "Claims",
    cell: (row) => (
      <span className="text-xs tabular-nums font-medium">
        {row.pendingReimbursements > 0 ? row.pendingReimbursements : "—"}
      </span>
    ),
  },
  {
    key: "pendingLoans",
    header: "Loans",
    cell: (row) => (
      <span className="text-xs tabular-nums font-medium">
        {row.pendingLoans > 0 ? row.pendingLoans : "—"}
      </span>
    ),
  },
  {
    key: "tax",
    header: "Tax decl.",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">
        {row.taxDeclarationStatus ?? "—"}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    cell: (row) =>
      row.actionCount > 0 ? (
        <span className="inline-flex items-center rounded-md border border-status-warning-rule bg-status-warning-surface px-1.5 py-0.5 text-micro font-medium text-status-warning-ink">
          {row.actionCount} open
        </span>
      ) : null,
  },
];

const REWARDS_COLUMNS: DataTableColumn<TeamRewardsMember>[] = [
  {
    key: "name",
    header: "Member",
    cell: (row) => (
      <span className="text-xs font-medium">{row.name ?? row.email ?? "Unknown user"}</span>
    ),
  },
  {
    key: "annualCtc",
    header: "Annual CTC",
    cell: (row) => (
      <span className="text-xs tabular-nums">{formatMoney(row.annualCtc)}</span>
    ),
  },
  {
    key: "benefits",
    header: "Benefits (employer/yr est.)",
    cell: (row) => (
      <span className="text-xs tabular-nums">
        {row.estimatedEmployerBenefitsAnnual
          ? formatMoney(row.estimatedEmployerBenefitsAnnual)
          : row.activeBenefitPlans > 0
            ? `${row.activeBenefitPlans} plan(s)`
            : "—"}
      </span>
    ),
  },
  {
    key: "equity",
    header: "Equity units",
    cell: (row) => (
      <span className="text-xs tabular-nums">
        {row.equityUnits > 0 ? row.equityUnits.toLocaleString("en-IN") : "—"}
      </span>
    ),
  },
];

export function TeamPayrollPageContent() {
  const { data, isLoading, isError, error, refetch } = useManagerInbox();
  const { data: teamRewards, isLoading: rewardsLoading } = useManagerTeamRewards();
  const approveReimb = useManagerApproveReimbursement();
  const rejectReimb = useManagerRejectReimbursement();
  const approveLoan = useManagerApproveLoan();
  const rejectLoan = useManagerRejectLoan();

  const members = data?.members ?? [];
  const pendingClaims = data?.pendingReimbursements ?? [];
  const pendingLoans = data?.pendingLoans ?? [];
  const totals = data?.totals;
  const canApproveClaims = Boolean(data?.canApproveReimbursements);
  const canApproveLoans = Boolean(data?.canApproveLoans);
  const compression = teamRewards?.payCompression;
  const busy =
    approveReimb.isPending ||
    rejectReimb.isPending ||
    approveLoan.isPending ||
    rejectLoan.isPending;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function onApproveClaim(row: ManagerPendingReimbursement) {
    approveReimb.mutate(row.id, {
      onSuccess: () => toast.success("Claim approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function onRejectClaim(row: ManagerPendingReimbursement) {
    rejectReimb.mutate(
      { reimbursementId: row.id },
      {
        onSuccess: () => toast.success("Claim rejected"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function onApproveLoan(row: ManagerPendingLoan) {
    approveLoan.mutate(row.id, {
      onSuccess: () => toast.success("Loan approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function onRejectLoan(row: ManagerPendingLoan) {
    rejectLoan.mutate(row.id, {
      onSuccess: () => toast.success("Loan rejected"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  if (isError) {
    return (
      <PageWrapper title="Team payroll" subtitle="Direct reports — approval when permitted">
        <ErrorState
          className="flex-1"
          title="Couldn't load your team"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Team payroll" subtitle="Direct reports — approval when permitted">
      <div className="space-y-4">
        <div
          role="status"
          className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-dense text-muted-foreground leading-snug">
            {data?.honestyNote ??
              "Direct reports only. Approving claims requires hr:expenses:approve; loans need hr:expenses:approve or hr:loans:manage."}
          </p>
        </div>

        <StatCardGrid cols={3}>
          <StatCard
            label="Direct reports"
            value={isLoading ? "—" : String(data?.reportCount ?? 0)}
            icon={Users}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Pending claims"
            value={isLoading ? "—" : String(totals?.pendingReimbursements ?? 0)}
            icon={AlertTriangle}
            tone="amber"
            isLoading={isLoading}
            hint={canApproveClaims ? "You can approve" : "View only"}
          />
          <StatCard
            label="Need attention"
            value={isLoading ? "—" : String(totals?.membersNeedingAction ?? 0)}
            icon={AlertTriangle}
            tone="default"
            isLoading={isLoading}
            hint="Claims, loans, or submitted tax"
          />
        </StatCardGrid>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            title="No direct reports"
            description="People who report to you (reporting manager) will appear here with payroll signals."
            action={{ label: "My payroll", href: "/me/pay" }}
          />
        ) : (
          <>
            {(pendingClaims.length > 0 || pendingLoans.length > 0) && (
              <div className="space-y-3">
                {pendingClaims.length > 0 && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-foreground">
                        Pending reimbursement claims
                      </p>
                    </div>
                    <ul className="divide-y divide-border">
                      {pendingClaims.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                              {row.userName ?? "Unknown user"} · {row.category}
                            </p>
                            <p className="text-dense text-muted-foreground tabular-nums">
                              {formatMoney(row.amount)}
                              {row.description ? ` — ${row.description}` : ""}
                            </p>
                          </div>
                          {canApproveClaims ? (
                            <div className="flex gap-1.5">
                              <LoadingButton
                                size="sm"
                                className="h-7 text-xs"
                                isPending={busy}
                                onClick={() => onApproveClaim(row)}
                              >
                                Approve
                              </LoadingButton>
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                isPending={busy}
                                onClick={() => onRejectClaim(row)}
                              >
                                Reject
                              </LoadingButton>
                            </div>
                          ) : (
                            <span className="text-micro text-muted-foreground">
                              Need hr:expenses:approve
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {pendingLoans.length > 0 && (
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-foreground">
                        Pending loan requests
                      </p>
                    </div>
                    <ul className="divide-y divide-border">
                      {pendingLoans.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                              {row.userName ?? "Unknown user"}
                            </p>
                            <p className="text-dense text-muted-foreground tabular-nums">
                              {formatMoney(row.amount)}
                              {row.totalEmis ? ` · ${row.totalEmis} EMIs` : ""}
                              {row.reason ? ` — ${row.reason}` : ""}
                            </p>
                          </div>
                          {canApproveLoans ? (
                            <div className="flex gap-1.5">
                              <LoadingButton
                                size="sm"
                                className="h-7 text-xs"
                                isPending={busy}
                                onClick={() => onApproveLoan(row)}
                              >
                                Approve
                              </LoadingButton>
                              <LoadingButton
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                isPending={busy}
                                onClick={() => onRejectLoan(row)}
                              >
                                Reject
                              </LoadingButton>
                            </div>
                          ) : (
                            <span className="text-micro text-muted-foreground">
                              Need approve permission
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DataTable
              data={members}
              columns={MEMBER_COLUMNS}
              getRowKey={(row) => row.userId}
              minWidth="720px"
              emptyState={null}
            />

            {compression && compression.sampleSize > 0 && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Team pay compression (CTC only)
                </p>
                <p className="text-micro text-muted-foreground leading-snug">
                  {compression.honestyNote}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-dense">
                  <div>
                    <p className="text-muted-foreground">Median</p>
                    <p className="font-semibold tabular-nums">
                      {formatMoney(compression.stats.median)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min – Max</p>
                    <p className="font-semibold tabular-nums">
                      {formatMoney(compression.stats.min)} –{" "}
                      {formatMoney(compression.stats.max)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ratio (max/min)</p>
                    <p className="font-semibold tabular-nums">
                      {compression.stats.compressionRatio ?? "—"}×
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Outliers</p>
                    <p className="font-semibold tabular-nums">
                      {compression.outliers.length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(teamRewards?.members.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Team total rewards (illustrative)
                </p>
                {rewardsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <DataTable
                    data={teamRewards?.members ?? []}
                    columns={REWARDS_COLUMNS}
                    getRowKey={(row) => row.userId}
                    minWidth="640px"
                    emptyState={null}
                  />
                )}
              </div>
            )}

            <p className="text-dense text-muted-foreground">
              Full admin queues:{" "}
              <Link
                href="/payroll/reimbursements"
                className="text-primary underline underline-offset-2"
              >
                Reimbursements
              </Link>
              {" · "}
              <Link href="/payroll/loans" className="text-primary underline underline-offset-2">
                Loans
              </Link>
              {" · "}
              <Link href="/payroll/taxes" className="text-primary underline underline-offset-2">
                Tax &amp; Statutory
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
