"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyPayroll } from "@/components/illustrations";
import { RunStatusBadge } from "@/features/payroll/runs/run-status-badge";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMoney, formatMonth } from "@/features/payroll/shared/payroll-format";
import {
  usePayrollRuns,
  useCreateRun,
  type PayrollRunType,
} from "@/hooks/api/payroll/runs";
import { usePayrollEntities } from "@/hooks/api/payroll/entities";
import { useCan } from "@/hooks/api/access";
import type { PayrollRunListItem } from "@/types/payroll/runs";

const RUN_TYPE_OPTIONS: { value: PayrollRunType; label: string; hint: string }[] = [
  { value: "REGULAR", label: "Regular", hint: "The month's standard payroll run" },
  { value: "BONUS", label: "Bonus", hint: "Approved variable pay, separate from regular pay" },
  { value: "OFF_CYCLE", label: "Off-cycle", hint: "Joiner, advance, or special payment" },
  { value: "CORRECTION", label: "Correction", hint: "Corrects a closed or paid result" },
  { value: "FINAL_SETTLEMENT", label: "Final settlement", hint: "Termination / final settlement run" },
];

const RUN_TYPES_NEEDING_SOURCE: PayrollRunType[] = ["OFF_CYCLE", "CORRECTION", "FINAL_SETTLEMENT"];

export function RunsPageContent() {
  const router = useRouter();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filterEntityId, setFilterEntityId] = useState<string>("all");
  const [showNewRun, setShowNewRun] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [newRunType, setNewRunType] = useState<PayrollRunType>("REGULAR");
  const [sourceRunId, setSourceRunId] = useState<string>("");
  const [newEntityId, setNewEntityId] = useState<string>("");

  const canManage = useCan("payroll:runs:manage");
  const { data: entities } = usePayrollEntities();
  const listParams = {
    cursor,
    limit: 20,
    ...(filterEntityId !== "all" ? { entityId: Number(filterEntityId) } : {}),
  };
  const { data, isLoading, isError, error, refetch } = usePayrollRuns(listParams);
  const createMutation = useCreateRun();

  const entityNameById = new Map(
    (entities ?? []).map((e) => [e.id, `${e.legalName} (${e.countryCode})`]),
  );

  const columns: DataTableColumn<PayrollRunListItem>[] = [
    {
      key: "month",
      header: "Month",
      cell: (row) => (
        <span className="text-dense font-medium">{formatMonth(row.month)}</span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.entityId != null
            ? (entityNameById.get(row.entityId) ?? `Entity #${row.entityId}`)
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <RunStatusBadge status={row.status} />,
    },
    {
      key: "employees",
      header: "Employees",
      cell: (row) => (
        <span className="tabular-nums text-dense">{row.employeeCount ?? "—"}</span>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatMoney(row.grossTotal)}</span>
      ),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums font-medium">
          {formatMoney(row.netTotal)}
        </span>
      ),
    },
    {
      key: "exceptions",
      header: "Exceptions",
      cell: (row) =>
        (row.exceptionCount ?? 0) > 0 ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium bg-status-danger-surface text-status-danger-ink border border-status-danger-rule">
            {row.exceptionCount}
          </span>
        ) : (
          <span className="text-dense text-muted-foreground">0</span>
        ),
    },
  ];

  function handleRowClick(row: PayrollRunListItem) {
    router.push(`/payroll/runs/${row.id}`);
  }

  const needsSource = RUN_TYPES_NEEDING_SOURCE.includes(newRunType);
  const sourceRunOptions = (data?.data ?? []).filter((r) => r.month === newRunMonth);
  const createDisabled = needsSource && sourceRunId === "";

  function resetNewRunForm() {
    setNewRunType("REGULAR");
    setSourceRunId("");
    setNewEntityId(entities?.[0] != null ? String(entities[0].id) : "");
  }

  function handleNewRunOpen() {
    resetNewRunForm();
    setShowNewRun(true);
  }

  function handleNewRunClose() {
    setShowNewRun(false);
  }

  function handleNewRunTypeChange(value: string) {
    setNewRunType(value as PayrollRunType);
    setSourceRunId("");
  }

  function handleNewRunCreate() {
    if (needsSource && sourceRunId === "") {
      toast.error("Select the source run this run adjusts");
      return;
    }
    createMutation.mutate(
      {
        month: newRunMonth,
        runType: newRunType,
        ...(needsSource ? { sourceRunId: Number(sourceRunId) } : {}),
        ...(newEntityId !== "" ? { entityId: Number(newEntityId) } : {}),
      },
      {
        onSuccess: (res) => {
          toast.success("Payroll run created");
          setShowNewRun(false);
          router.push(`/payroll/runs/${res.runId}`);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <PageWrapper
      title="Payroll Runs"
      subtitle="View and manage payroll runs by month"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleNewRunOpen}>
            New run
          </Button>
        ) : undefined
      }
    >
      {(entities?.length ?? 0) > 0 ? (
        <div className="mb-2 flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Entity</label>
          <Select
            value={filterEntityId}
            onValueChange={(v) => {
              setFilterEntityId(v);
              setCursor(undefined);
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {(entities ?? []).map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.legalName} ({e.countryCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load payroll runs"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={data?.data ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          minWidth="720px"
          footer={
            data?.pagination.hasMore ? (
              <div className="flex justify-end px-4 py-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCursor(data.pagination.nextCursor ?? undefined)}
                >
                  Next page
                </Button>
              </div>
            ) : cursor != null ? (
              <div className="flex justify-end px-4 py-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCursor(undefined)}
                >
                  Back to start
                </Button>
              </div>
            ) : undefined
          }
          emptyState={
            <EmptyState
              illustration={<EmptyPayroll />}
              title="No payroll runs"
              description="Start your first payroll run to see it here"
              action={canManage ? { label: "New run", onClick: handleNewRunOpen } : undefined}
            />
          }
        />
      )}

      <Dialog open={showNewRun} onOpenChange={setShowNewRun}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new payroll run</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="space-y-1.5">
              <label className="text-label font-medium text-foreground block">
                Run type
              </label>
              <Select value={newRunType} onValueChange={handleNewRunTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-dense text-muted-foreground">
                {RUN_TYPE_OPTIONS.find((o) => o.value === newRunType)?.hint}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-label font-medium text-foreground block">
                Payroll month
              </label>
              <MonthPicker
                value={newRunMonth}
                onChange={setNewRunMonth}
                yearRange={[-1, 0]}
                className="w-full"
              />
            </div>

            {(entities?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <label className="text-label font-medium text-foreground block">
                  Legal entity
                </label>
                <Select value={newEntityId || undefined} onValueChange={setNewEntityId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Optional — scopes statutory pack" />
                  </SelectTrigger>
                  <SelectContent>
                    {(entities ?? []).map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.legalName} ({e.countryCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-dense text-muted-foreground">
                  Binds the run to the entity&apos;s country pack and opens the matching
                  period. One REGULAR run is allowed per entity per month (org-level runs
                  without an entity remain a separate bucket).
                </p>
              </div>
            )}

            {needsSource && (
              <div className="space-y-1.5">
                <label className="text-label font-medium text-foreground block">
                  Source run <span className="text-destructive">*</span>
                </label>
                <Select value={sourceRunId} onValueChange={setSourceRunId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select the run this adjusts" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceRunOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No runs for {formatMonth(newRunMonth)} to link to
                      </div>
                    ) : (
                      sourceRunOptions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {formatMonth(r.month)} · {r.status.replace(/_/g, " ")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-dense text-muted-foreground">
                  Off-cycle, correction, and final-settlement runs link back to the
                  regular run they adjust.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleNewRunClose}>
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              onClick={handleNewRunCreate}
              disabled={createDisabled}
              isPending={createMutation.isPending}
              loadingText="Creating…"
            >
              Create
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
