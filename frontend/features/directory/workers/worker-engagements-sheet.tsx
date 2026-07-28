"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import {
  useWorkerEngagements,
  useCreateEngagement,
  useTerminateEngagement,
} from "@/hooks/api/directory/workers";
import type {
  Worker,
  WorkerEngagement,
  EngagementStatus,
  WorkerType,
} from "@/types/directory/workers";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

const WORKER_TYPE_OPTIONS: { value: WorkerType; label: string }[] = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "INTERN", label: "Intern" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "AGENCY", label: "Agency" },
  { value: "FREELANCER", label: "Freelancer" },
];

const ENGAGEMENT_STATUS_TONE: Record<EngagementStatus, BadgeTone> = {
  PLANNED: "info",
  ACTIVE: "success",
  COMPLETED: "neutral",
  TERMINATED: "danger",
  CANCELLED: "warning",
};

function engagementStatusLabel(status: EngagementStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function workerTypeLabel(type: WorkerType): string {
  return WORKER_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function periodLabel(engagement: WorkerEngagement): string {
  const start = formatDateShort(engagement.startsOn);
  if (!engagement.endsOn) return `${start} – ongoing`;
  return `${start} – ${formatDateShort(engagement.endsOn)}`;
}

const engagementSchema = z.object({
  startsOn: z.string().min(1, "Start date is required"),
  endsOn: z.string().optional(),
  workerType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACTOR",
    "CONSULTANT",
    "INTERN",
    "TEMPORARY",
    "AGENCY",
    "FREELANCER",
  ]),
  isPrimary: z.boolean(),
  designation: z.string().max(200).optional(),
});

type EngagementFormValues = z.infer<typeof engagementSchema>;

const EMPTY_ENGAGEMENT_DEFAULTS: EngagementFormValues = {
  startsOn: "",
  endsOn: "",
  workerType: "FULL_TIME",
  isPrimary: false,
  designation: "",
};

function TerminateAlertDialog({
  open,
  onOpenChange,
  engagement,
  workerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement: WorkerEngagement;
  workerId: string;
}) {
  const terminateEngagement = useTerminateEngagement();

  function handleConfirm() {
    terminateEngagement.mutate(
      {
        workerEngagementId: engagement.workerEngagementId,
        workerId,
      },
      {
        onSuccess: () => {
          toast.success("Engagement terminated");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Terminate this engagement?</AlertDialogTitle>
          <AlertDialogDescription>
            This will terminate the {workerTypeLabel(engagement.workerType).toLowerCase()}{" "}
            engagement started on {formatDateShort(engagement.startsOn)}. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={terminateEngagement.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={handleConfirm}
            disabled={terminateEngagement.isPending}
          >
            {terminateEngagement.isPending ? "Terminating…" : "Terminate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EngagementRowActions({
  engagement,
  workerId,
  canTerminate,
}: {
  engagement: WorkerEngagement;
  workerId: string;
  canTerminate: boolean;
}) {
  const [terminateOpen, setTerminateOpen] = useState(false);

  if (!canTerminate || engagement.status !== "ACTIVE") return null;

  function handleOpenTerminate() {
    setTerminateOpen(true);
  }

  function handleTerminateOpenChange(open: boolean) {
    setTerminateOpen(open);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleOpenTerminate}
      >
        Terminate
      </Button>
      {terminateOpen && (
        <TerminateAlertDialog
          open={terminateOpen}
          onOpenChange={handleTerminateOpenChange}
          engagement={engagement}
          workerId={workerId}
        />
      )}
    </>
  );
}

function AddEngagementForm({
  workerId,
  onSuccess,
}: {
  workerId: string;
  onSuccess: () => void;
}) {
  const createEngagement = useCreateEngagement();
  const [expanded, setExpanded] = useState(false);

  const form = useForm<EngagementFormValues>({
    resolver: zodResolver(engagementSchema),
    defaultValues: EMPTY_ENGAGEMENT_DEFAULTS,
  });

  function handleToggleExpand() {
    setExpanded((prev) => !prev);
    if (!expanded) {
      form.reset(EMPTY_ENGAGEMENT_DEFAULTS);
    }
  }

  function handleSubmit(values: EngagementFormValues) {
    createEngagement.mutate(
      {
        workerId,
        startsOn: values.startsOn,
        endsOn: values.endsOn || undefined,
        workerType: values.workerType,
        isPrimary: values.isPrimary,
        designation: values.designation || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Engagement added");
          form.reset(EMPTY_ENGAGEMENT_DEFAULTS);
          setExpanded(false);
          onSuccess();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleCancel() {
    setExpanded(false);
    form.reset(EMPTY_ENGAGEMENT_DEFAULTS);
  }

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs"
        onClick={handleToggleExpand}
      >
        + Add engagement
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">New engagement</p>
      <Form {...form}>
        <form
          id="add-engagement-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-3"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startsOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endsOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date (optional)</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Open-ended"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="workerType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worker type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {WORKER_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Senior Engineer" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isPrimary"
            render={({ field }) => (
              <FormItem>
                <label className="flex cursor-pointer items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="engagement-is-primary"
                    />
                  </FormControl>
                  <span className="text-sm">Mark as primary engagement</span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={createEngagement.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="add-engagement-form"
              size="sm"
              isPending={createEngagement.isPending}
              loadingText="Saving…"
            >
              Add engagement
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker;
}

export function WorkerEngagementsSheet({ open, onOpenChange, worker }: Props) {
  const canManage = useCan("workforce:workers:manage");
  const canTerminate = useCan("workforce:workers:terminate");

  const { data: engagements, isLoading, isError, refetch } = useWorkerEngagements(
    worker.workerId,
  );

  function handleRetry() {
    void refetch();
  }

  const handleEngagementAdded = useCallback(() => {
    void refetch();
  }, [refetch]);

  const workerLabel = worker.displayName
    ? worker.displayName
    : (`${worker.firstName} ${worker.lastName}`.trim() || worker.workerNumber) ?? "Worker";

  const columns: DataTableColumn<WorkerEngagement>[] = [
    {
      key: "period",
      header: "Period",
      className: "min-w-[180px]",
      cell: (row) => (
        <span className={cn("text-sm text-foreground tabular-nums", TEXT_ONE_LINE)}>
          {periodLabel(row)}
        </span>
      ),
    },
    {
      key: "workerType",
      header: "Type",
      className: "min-w-[100px]",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {workerTypeLabel(row.workerType)}
        </span>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      className: "min-w-[120px]",
      cell: (row) => (
        <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {row.designation ?? "—"}
        </span>
      ),
    },
    {
      key: "isPrimary",
      header: "Primary",
      className: "min-w-[70px]",
      cell: (row) =>
        row.isPrimary ? (
          <SemanticBadge tone="accent" label="Primary" size="xs" />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      className: "min-w-[90px]",
      cell: (row) => (
        <SemanticBadge
          tone={ENGAGEMENT_STATUS_TONE[row.status]}
          label={engagementStatusLabel(row.status)}
          size="xs"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-24 shrink-0",
      cell: (row) => (
        <EngagementRowActions
          engagement={row}
          workerId={worker.workerId}
          canTerminate={canTerminate}
        />
      ),
    },
  ];

  const rows = engagements ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-4">
          <SheetTitle className="text-base font-semibold">
            Engagements — {workerLabel}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {worker.workerNumber ? `#${worker.workerNumber} · ` : ""}
            Manage engagements for this worker.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-4 px-6 py-4">
          {isLoading ? (
            <DataTableSkeleton rows={5} columns={6} />
          ) : isError ? (
            <ErrorState compact onRetry={handleRetry} />
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              illustrationPreset="default"
              title="No engagements yet"
              description="Add the first engagement for this worker."
            />
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              getRowKey={(row) => row.workerEngagementId}
              minWidth="520px"
            />
          )}

          {canManage && (
            <AddEngagementForm
              workerId={worker.workerId}
              onSuccess={handleEngagementAdded}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
