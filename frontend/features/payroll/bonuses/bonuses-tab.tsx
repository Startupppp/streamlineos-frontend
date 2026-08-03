"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BonusStatusBadge } from "./bonus-status-badge";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import {
  useBonuses,
  useUpdateBonus,
  type Bonus,
} from "@/hooks/api/payroll/bonuses-admin";
import { useCan } from "@/hooks/api/access";
import { EmptyReportIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { CreateBonusDialog } from "./create-bonus-dialog";
import {
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  TYPE_COLORS,
  getCurrentMonth,
  getBonusMonth,
  formatDate,
} from "./bonus-schema";

export function BonusesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

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

  function handleOpenCreate() {
    setCreateOpen(true);
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

  const filtered = useMemo(
    () =>
      (data ?? []).filter((b) => {
        const monthMatch = getBonusMonth(b) === month;
        const typeMatch = type === "all" || b.type === type;
        const statusMatch = status === "all" || b.status === status;
        return monthMatch && typeMatch && statusMatch;
      }),
    [data, month, type, status],
  );

  const actionColumn: DataTableColumn<Bonus> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <div className="flex items-center gap-1">
          <LoadingButton
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
            isPending={updateBonus.isPending}
            onClick={makeApproveHandler(row.id)}
          >
            Approve
          </LoadingButton>
          <LoadingButton
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
            isPending={updateBonus.isPending}
            onClick={makeRejectHandler(row.id)}
          >
            Reject
          </LoadingButton>
        </div>
      ) : null,
  };

  const columns: DataTableColumn<Bonus>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="min-w-0">
          <TruncatedText
            text={row.userName ?? "Unknown user"}
            className="text-[11px] font-medium text-foreground max-w-[140px]"
          />
          {row.userEmail && (
            <TruncatedText
              text={row.userEmail}
              className="text-[10px] text-muted-foreground max-w-[140px]"
            />
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
            TYPE_COLORS[row.type] ?? "bg-muted text-muted-foreground border-border"
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
        <TruncatedText
          text={row.reason ?? "—"}
          className="text-[10px] text-muted-foreground max-w-[160px]"
        />
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

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-0 pt-3">
      <div className={`${FILTER_TOOLBAR_ROW} mb-3`}>
        <MonthPicker value={month} onChange={handleMonthChange} yearRange={[-1, 0]} className="w-44" />
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`}>
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
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`}>
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
        {canManage && (
          <AnimatedIconButton
            icon={PlusIcon}
            iconClassName="mr-1.5"
            size="sm"
            className="ml-auto"
            onClick={handleOpenCreate}
          >
            Add Bonus
          </AnimatedIconButton>
        )}
      </div>
      <DataTable
        className="flex-1 min-h-0"
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
      <CreateBonusDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
