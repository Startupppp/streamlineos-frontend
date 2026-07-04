"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { BonusStatusBadge } from "./bonus-status-badge";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { useBonuses, useUpdateBonus, type Bonus } from "@/hooks/api/payroll/bonuses-admin";
import { useCan } from "@/hooks/api/access";
import { EmptyReportIllustration } from "@/components/illustrations";

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SPOT", label: "Spot Award" },
  { value: "ANNUAL", label: "Annual" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

const TYPE_COLORS: Record<string, string> = {
  PERFORMANCE: "bg-blue-50 text-blue-700 border-blue-200",
  FESTIVAL: "bg-violet-50 text-violet-700 border-violet-200",
  REFERRAL: "bg-cyan-50 text-cyan-700 border-cyan-200",
  SPOT: "bg-amber-50 text-amber-700 border-amber-200",
  ANNUAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getBonusMonth(bonus: Bonus): string | null {
  if (bonus.month) return bonus.month;
  if (!bonus.createdAt) return null;
  const d = new Date(bonus.createdAt);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BonusesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const month = searchParams.get("b_month") ?? getCurrentMonth();
  const type = searchParams.get("b_type") ?? "all";
  const status = searchParams.get("b_status") ?? "all";

  const { data, isLoading } = useBonuses();
  const updateBonus = useUpdateBonus();
  const canManage = useCan("hr:bonuses:manage");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleMonthChange(value: string) {
    updateParam("b_month", value);
  }

  function handleTypeChange(value: string) {
    updateParam("b_type", value);
  }

  function handleStatusChange(value: string) {
    updateParam("b_status", value);
  }

  function makeApproveHandler(id: number) {
    function handleApprove() {
      updateBonus.mutate(
        { id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Bonus approved"),
          onError: () => toast.error("Failed to approve bonus"),
        },
      );
    }
    return handleApprove;
  }

  function makeRejectHandler(id: number) {
    function handleReject() {
      updateBonus.mutate(
        { id, status: "REJECTED" },
        {
          onSuccess: () => toast.success("Bonus rejected"),
          onError: () => toast.error("Failed to reject bonus"),
        },
      );
    }
    return handleReject;
  }

  const filtered = (data ?? []).filter((b) => {
    const monthMatch = getBonusMonth(b) === month;
    const typeMatch = type === "all" || b.type === type;
    const statusMatch = status === "all" || b.status === status;
    return monthMatch && typeMatch && statusMatch;
  });

  const actionColumn: DataTableColumn<Bonus> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            disabled={updateBonus.isPending}
            onClick={makeApproveHandler(row.id)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
            disabled={updateBonus.isPending}
            onClick={makeRejectHandler(row.id)}
          >
            Reject
          </Button>
        </div>
      ) : null,
  };

  const columns: DataTableColumn<Bonus>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-foreground truncate max-w-[140px]">
            {row.userName ?? row.userId}
          </p>
          {row.userEmail && (
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {row.userEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
            TYPE_COLORS[row.type] ?? "bg-slate-50 text-slate-700 border-slate-200"
          }`}
        >
          {row.type.charAt(0) + row.type.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.amount)}</span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <span className="text-[10px] text-muted-foreground truncate max-w-[160px] block">
          {row.reason ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <BonusStatusBadge status={row.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => (
        <span className="text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(canManage ? [actionColumn] : []),
  ];

  const filterBar = (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <MonthPicker value={month} onChange={handleMonthChange} yearRange={[-1, 0]} className="w-44" />
      <Select value={type} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-8 text-sm w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 text-sm w-36">
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
    </div>
  );

  return (
    <div className="flex flex-col gap-0 pt-3">
      {filterBar}
      <Card className="flex min-h-0 min-w-0 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-col overflow-hidden p-0">
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="700px"
            emptyState={
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No bonuses found"
                description="No bonuses match the current filters."
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
