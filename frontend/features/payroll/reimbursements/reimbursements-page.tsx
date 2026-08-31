"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { MobileFilterDrawer } from "@/features/payroll/shared/mobile-filter-drawer";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { ReimbursementStatusBadge } from "./reimbursement-status-badge";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import { formatShortDate } from "@/lib/date-utils";
import {
  useReimbursements,
  useProcessReimbursement,
  type Reimbursement,
} from "@/hooks/api/hr/reimbursements";
import { useCan } from "@/hooks/api/access";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { ApprovalActions } from "@/features/hr/shared/approval-actions";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "TRAVEL", label: "Travel" },
  { value: "FOOD", label: "Food" },
  { value: "INTERNET", label: "Internet" },
  { value: "MEDICAL", label: "Medical" },
  { value: "FUEL", label: "Fuel" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "CLIENT_PROJECT", label: "Client / Project" },
  { value: "CUSTOM", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toYearMonth(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}


export function ReimbursementsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const month = searchParams.get("month") ?? getCurrentMonth();
  const status = searchParams.get("status") ?? "all";
  const category = searchParams.get("category") ?? "all";

  const { data, isLoading, isError, error, refetch } = useReimbursements();
  const processReimbursement = useProcessReimbursement();
  const canApprove = useCan("hr:payroll:approve");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleMonthChange(value: string) {
    updateParam("month", value);
  }

  function handleStatusChange(value: string) {
    updateParam("status", value);
  }

  function handleCategoryChange(value: string) {
    updateParam("category", value);
  }

  function makeApproveHandler(id: number) {
    function handleApprove() {
      processReimbursement.mutate(
        { id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Claim approved"),
          onError: () => toast.error("Failed to approve claim"),
        },
      );
    }
    return handleApprove;
  }

  function makeRejectHandler(id: number) {
    function handleReject(reason: string) {
      processReimbursement.mutate(
        { id, status: "REJECTED", rejectionReason: reason },
        {
          onSuccess: () => toast.success("Claim rejected"),
          onError: () => toast.error("Failed to reject claim"),
        },
      );
    }
    return handleReject;
  }

  const filtered = (data ?? []).filter((r) => {
    const monthMatch = toYearMonth(r.createdAt) === month;
    const statusMatch = status === "all" || r.status === status;
    const categoryMatch =
      category === "all" || r.category.toUpperCase().replace(/\s+/g, "_") === category;
    return monthMatch && statusMatch && categoryMatch;
  });

  const actionColumn: DataTableColumn<Reimbursement> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <ApprovalActions
          onApprove={makeApproveHandler(row.id)}
          onReject={makeRejectHandler(row.id)}
          isApproving={processReimbursement.isPending}
          isRejecting={processReimbursement.isPending}
          rejectTitle="Reject Claim"
          rejectDescription="Provide a reason for rejecting this reimbursement claim."
          approveLabel="Approve"
          rejectLabel="Reject Claim"
          size="sm"
          className="[&_button]:h-6 [&_button]:text-micro [&_button]:px-2"
        />
      ) : null,
  };

  const columns: DataTableColumn<Reimbursement>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.user?.name ?? "—"} className="text-dense font-medium" />
          <TruncatedText text={row.user?.email ?? "Unknown user"} className="text-micro text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border bg-muted text-muted-foreground border-border">
          {row.category}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatMoney(row.amount)}</span>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (row) =>
        row.receiptUrl ? (
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-micro text-primary hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-micro text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ReimbursementStatusBadge status={row.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => (
        <span className="text-micro text-muted-foreground">{formatShortDate(row.createdAt)}</span>
      ),
    },
    ...(canApprove ? [actionColumn] : []),
  ];

  const filterBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <MonthPicker value={month} onChange={handleMonthChange} yearRange={[-1, 0]} className="w-44" />
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} hidden sm:flex w-36`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={handleCategoryChange}>
        <SelectTrigger className={`${FILTER_SELECT_TRIGGER} hidden sm:flex w-44`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <MobileFilterDrawer
        ariaLabel="Filter reimbursements"
        groups={[
          { label: "Status", value: status, options: STATUS_OPTIONS, onChange: handleStatusChange },
          { label: "Category", value: category, options: CATEGORIES, onChange: handleCategoryChange },
        ]}
      />
    </div>
  );

  return (
    <PageWrapper
      title="Reimbursements"
      subtitle="Review and approve employee expense claims"
      filters={filterBar}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <div className="shrink-0 rounded-lg border border-status-info-rule bg-status-info-surface px-3 py-2 text-xs text-status-info-ink">
          Approved claims flow into the{" "}
          <span className="font-medium">{formatMonth(month)}</span> payroll run automatically.
          Approved reimbursements are included as payroll inputs.
        </div>
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load reimbursements"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={filtered}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="820px"
            emptyState={
              <EmptyState
                illustration={<EmptyExpensesIllustration />}
                title="No claims found"
                description="No reimbursement claims match the current filters."
              />
            }
          />
        )}
      </div>
    </PageWrapper>
  );
}
