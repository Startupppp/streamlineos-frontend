"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppSheet } from "@/components/shared/app-sheet";
import { DatePicker } from "@/components/ui/date-picker";
import { Money } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCollectionsSummary,
  useCreateCollectionActivity,
  useUpdateInvoiceCollection,
} from "@/hooks/api/accounting/ar";
import type { TopRiskCustomer, CollectionActivityType } from "@/types/accounting/ar";
import { useCan } from "@/hooks/api/access";

interface ActivitySheetState {
  open: boolean;
  clientId: number | null;
  clientName: string;
}

interface CollectionOwnerPopoverProps {
  clientId: number;
  currentOwner: string | null;
  invoiceId: number | null;
}

function CollectionOwnerPopover({
  currentOwner,
  invoiceId,
}: CollectionOwnerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentOwner ?? "");
  const mutation = useUpdateInvoiceCollection();
  const canManage = useCan("accounting:collections:manage");

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setValue(e.target.value);
  }

  function handleAssign(): void {
    if (!invoiceId) return;
    mutation.mutate(
      { invoiceId, collectionOwnerId: value || undefined },
      {
        onSuccess: () => {
          toast.success("Owner assigned");
          setOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (!canManage) {
    return (
      <span className="text-xs text-muted-foreground">{currentOwner ?? "—"}</span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs text-left hover:underline text-muted-foreground max-w-[100px] truncate"
        >
          {currentOwner ?? "Assign…"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 space-y-2" align="start">
        <Label className="text-xs">User ID</Label>
        <Input
          value={value}
          onChange={handleValueChange}
          className="h-7 text-xs"
          placeholder="owner-user-id"
        />
        <LoadingButton
          size="sm"
          className="w-full h-7 text-xs"
          isPending={mutation.isPending}
          onClick={handleAssign}
          loadingText="Saving…"
        >
          Assign
        </LoadingButton>
      </PopoverContent>
    </Popover>
  );
}

interface PromiseDatePopoverProps {
  invoiceId: number | null;
  currentDate: string | null;
}

function PromiseDatePopover({ invoiceId, currentDate }: PromiseDatePopoverProps) {
  const [open, setOpen] = useState(false);
  const mutation = useUpdateInvoiceCollection();
  const canManage = useCan("accounting:collections:manage");

  function handleDateChange(value: string): void {
    if (!invoiceId) return;
    mutation.mutate(
      { invoiceId, promiseToPayDate: value },
      {
        onSuccess: () => {
          toast.success("Promise date set");
          setOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (!canManage) {
    return (
      <span className="text-xs text-muted-foreground">
        {currentDate ? new Date(currentDate).toLocaleDateString() : "—"}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-xs hover:underline text-muted-foreground"
        >
          {currentDate ? new Date(currentDate).toLocaleDateString() : "Set date…"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <DatePicker
          value={currentDate ?? undefined}
          onChange={handleDateChange}
          className="h-8 text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}

interface ActivitySheetTriggerProps {
  row: TopRiskCustomer;
  onOpen: (customer: TopRiskCustomer, name: string) => void;
}

function ActivitySheetTrigger({ row, onOpen }: ActivitySheetTriggerProps) {
  function handleClick(): void {
    onOpen(row, `Customer #${row.clientId}`);
  }

  return (
    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClick}>
      + Activity
    </Button>
  );
}

const ACTIVITY_TYPE_LABELS: Record<CollectionActivityType, string> = {
  NOTE: "Note",
  PROMISE_TO_PAY: "Promise to Pay",
  CALL: "Call",
  EMAIL: "Email",
};

const COLLECTION_ACTIVITY_TYPE_KEYS = Object.keys(ACTIVITY_TYPE_LABELS) as Array<keyof typeof ACTIVITY_TYPE_LABELS>;

function isCollectionActivityType(v: string): v is CollectionActivityType {
  return v in ACTIVITY_TYPE_LABELS;
}

export function CollectionsTab() {
  const summary = useCollectionsSummary();
  const createActivity = useCreateCollectionActivity();
  const [activitySheet, setActivitySheet] = useState<ActivitySheetState>({
    open: false,
    clientId: null,
    clientName: "",
  });
  const [activityType, setActivityType] = useState<CollectionActivityType>("NOTE");
  const [activityNote, setActivityNote] = useState("");
  const [activityPromiseDate, setActivityPromiseDate] = useState("");

  const agingBuckets = summary.data?.agingBuckets ?? [];
  const topRisk = summary.data?.topRiskCustomers ?? [];

  function handleOpenActivitySheet(customer: TopRiskCustomer, name: string): void {
    setActivitySheet({ open: true, clientId: customer.clientId, clientName: name });
    setActivityType("NOTE");
    setActivityNote("");
    setActivityPromiseDate("");
  }

  function handleCloseActivitySheet(): void {
    setActivitySheet({ open: false, clientId: null, clientName: "" });
  }

  function handleActivitySheetOpenChange(open: boolean): void {
    if (!open) handleCloseActivitySheet();
  }

  function handleActivityTypeChange(value: string): void {
    if (isCollectionActivityType(value)) setActivityType(value);
  }

  function handleActivityNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setActivityNote(e.target.value);
  }

  function handleActivityPromiseDateChange(value: string): void {
    setActivityPromiseDate(value);
  }

  function handleSubmitActivity(): void {
    if (!activitySheet.clientId) return;
    createActivity.mutate(
      {
        clientId: activitySheet.clientId,
        type: activityType,
        note: activityNote || undefined,
        promisedDate: activityPromiseDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Activity logged");
          handleCloseActivitySheet();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const riskColumns: DataTableColumn<TopRiskCustomer>[] = [
    {
      key: "client",
      header: "Customer",
      cell: (row) => (
        <span className="text-sm font-medium">Customer #{row.clientId}</span>
      ),
    },
    {
      key: "overdueAmount",
      header: "Overdue",
      cell: (row) => <Money value={row.overdueAmount} compact />,
    },
    {
      key: "totalInvoiced",
      header: "Total Invoiced",
      cell: (row) => <Money value={row.totalInvoiced} compact />,
    },
    {
      key: "daysOverdue",
      header: "Days Overdue",
      cell: (row) => (
        <span className="text-sm tabular-nums">{row.maxDaysOverdue}d</span>
      ),
    },
    {
      key: "riskScore",
      header: "Risk",
      cell: (row) => (
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="w-16 bg-muted rounded-full h-2 shrink-0">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                row.riskScore > 70
                  ? "bg-red-500"
                  : row.riskScore > 40
                    ? "bg-amber-500"
                    : "bg-emerald-500",
              )}
              style={{ width: `${row.riskScore}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {row.riskScore}
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => (
        <CollectionOwnerPopover
          clientId={row.clientId}
          currentOwner={null}
          invoiceId={null}
        />
      ),
    },
    {
      key: "promise",
      header: "Promise Date",
      cell: (row) => (
        <PromiseDatePopover invoiceId={null} currentDate={null} key={row.clientId} />
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <ActivitySheetTrigger row={row} onOpen={handleOpenActivitySheet} />
      ),
      className: "w-28",
    },
  ];

  return (
    <div className="space-y-4">
      {agingBuckets.length > 0 && (
        <StatCardGrid cols={5}>
          {agingBuckets.map((bucket) => (
            <StatCard
              key={bucket.label}
              label={bucket.label}
              value={bucket.count}
              hint={`$${bucket.amount.toLocaleString()}`}
              tone={
                bucket.label === "91+"
                  ? "red"
                  : bucket.label === "61-90"
                    ? "amber"
                    : bucket.label === "current"
                      ? "emerald"
                      : "default"
              }
              isLoading={summary.isLoading}
            />
          ))}
        </StatCardGrid>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Top Overdue Customers</h3>
        {topRisk.length === 0 && !summary.isLoading ? (
          <EmptyState
            illustrationPreset="clients"
            title="No overdue customers"
            description="All receivables are current."
            compact
          />
        ) : (
          <DataTable
            data={topRisk}
            columns={riskColumns}
            getRowKey={(row) => row.clientId}
            isLoading={summary.isLoading}
            emptyState={
              <EmptyState
                illustrationPreset="clients"
                title="No overdue customers"
                compact
              />
            }
          />
        )}
      </div>

      <AppSheet
        open={activitySheet.open}
        onOpenChange={handleActivitySheetOpenChange}
        title={`Log Activity — ${activitySheet.clientName}`}
        description="Record a call, email, note, or promise to pay."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={handleCloseActivitySheet}>
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              isPending={createActivity.isPending}
              loadingText="Saving…"
              onClick={handleSubmitActivity}
            >
              Save Activity
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Activity Type</Label>
            <Select value={activityType} onValueChange={handleActivityTypeChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLECTION_ACTIVITY_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {ACTIVITY_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activityType === "PROMISE_TO_PAY" && (
            <div className="space-y-1">
              <Label className="text-xs">Promised Date</Label>
              <DatePicker
                value={activityPromiseDate}
                onChange={handleActivityPromiseDateChange}
                className="h-8 text-sm w-full"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Note</Label>
            <Textarea
              rows={4}
              className="resize-none text-sm"
              placeholder="Details about this activity…"
              value={activityNote}
              onChange={handleActivityNoteChange}
            />
          </div>
        </div>
      </AppSheet>
    </div>
  );
}
