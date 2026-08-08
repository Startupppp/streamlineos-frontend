"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  useCancelEngagement,
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

const NON_BLOCKING_ENGAGEMENT_STATUSES = new Set<EngagementStatus>([
  "COMPLETED",
  "TERMINATED",
  "CANCELLED",
]);

/** Matches the database's half-open daterange rule: [start, end). */
function findConflictingEngagement(
  period: { startsOn: string; endsOn?: string | null },
  engagements: WorkerEngagement[],
): WorkerEngagement | undefined {
  const periodEnd = period.endsOn || "9999-12-31";
  return engagements.find((engagement) => {
    if (NON_BLOCKING_ENGAGEMENT_STATUSES.has(engagement.status)) return false;
    const existingEnd = engagement.endsOn || "9999-12-31";
    return period.startsOn < existingEnd && engagement.startsOn < periodEnd;
  });
}

const engagementSchema = z
  .object({
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
  })
  .superRefine((value, context) => {
    if (value.endsOn && value.startsOn && value.endsOn <= value.startsOn) {
      context.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End date must be after the start date",
      });
    }
  });

type EngagementFormValues = z.infer<typeof engagementSchema>;

const EMPTY_ENGAGEMENT_DEFAULTS: EngagementFormValues = {
  startsOn: "",
  endsOn: "",
  workerType: "FULL_TIME",
  isPrimary: false,
  designation: "",
};

function DialogError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
    >
      {getErrorMessage(error)}
    </div>
  );
}

function TerminateConfirmationDialog({
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
  const [error, setError] = useState<unknown>(null);

  function handleConfirm() {
    setError(null);
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
        onError: setError,
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Terminate this engagement?"
      description={
        <>
          This ends the {workerTypeLabel(engagement.workerType).toLowerCase()} engagement
          started on {formatDateShort(engagement.startsOn)}. Its history will be preserved.
        </>
      }
      content={<DialogError error={error} />}
      confirmLabel={error ? "Try again" : "Terminate"}
      destructive
      keepOpenOnConfirm
      isPending={terminateEngagement.isPending}
      onConfirm={handleConfirm}
    />
  );
}

function CancelPlannedConfirmationDialog({
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
  const cancelEngagement = useCancelEngagement();
  const [error, setError] = useState<unknown>(null);

  function handleConfirm() {
    setError(null);
    cancelEngagement.mutate(
      { workerEngagementId: engagement.workerEngagementId, workerId },
      {
        onSuccess: () => {
          toast.success("Planned engagement cancelled");
          onOpenChange(false);
        },
        onError: setError,
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Cancel this planned engagement?"
      description={
        <>
          This frees the dates reserved by the{" "}
          {workerTypeLabel(engagement.workerType).toLowerCase()} plan starting on{" "}
          {formatDateShort(engagement.startsOn)}. The record stays in history and can still
          be audited.
        </>
      }
      content={<DialogError error={error} />}
      confirmLabel={error ? "Try again" : "Cancel engagement"}
      destructive
      keepOpenOnConfirm
      isPending={cancelEngagement.isPending}
      onConfirm={handleConfirm}
    />
  );
}

function EngagementRowActions({
  engagement,
  workerId,
  canManage,
  canTerminate,
}: {
  engagement: WorkerEngagement;
  workerId: string;
  canManage: boolean;
  canTerminate: boolean;
}) {
  const [dialog, setDialog] = useState<"cancel" | "terminate" | null>(null);
  const canCancelPlan = canManage && engagement.status === "PLANNED";
  const canEndActive = canTerminate && engagement.status === "ACTIVE";

  if (!canCancelPlan && !canEndActive) return null;

  function handleOpenChange(open: boolean) {
    if (!open) setDialog(null);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setDialog(canCancelPlan ? "cancel" : "terminate")}
      >
        {canCancelPlan ? "Cancel plan" : "Terminate"}
      </Button>
      {dialog === "cancel" ? (
        <CancelPlannedConfirmationDialog
          open
          onOpenChange={handleOpenChange}
          engagement={engagement}
          workerId={workerId}
        />
      ) : null}
      {dialog === "terminate" ? (
        <TerminateConfirmationDialog
          open
          onOpenChange={handleOpenChange}
          engagement={engagement}
          workerId={workerId}
        />
      ) : null}
    </>
  );
}

function AddEngagementForm({
  workerId,
  engagements,
  onSuccess,
}: {
  workerId: string;
  engagements: WorkerEngagement[];
  onSuccess: () => void;
}) {
  const createEngagement = useCreateEngagement();
  const [expanded, setExpanded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<EngagementFormValues>({
    resolver: zodResolver(engagementSchema),
    defaultValues: EMPTY_ENGAGEMENT_DEFAULTS,
  });

  function handleToggleExpand() {
    setExpanded((prev) => !prev);
    setSubmitError(null);
    if (!expanded) {
      form.reset(EMPTY_ENGAGEMENT_DEFAULTS);
    }
  }

  function handleSubmit(values: EngagementFormValues) {
    setSubmitError(null);
    const conflict = findConflictingEngagement(
      { startsOn: values.startsOn, endsOn: values.endsOn },
      engagements,
    );
    if (conflict) {
      const resolution =
        conflict.status === "PLANNED"
          ? "Cancel that plan above, or choose dates outside its period."
          : "End that active engagement above, or choose dates outside its period.";
      setSubmitError(
        "These dates overlap the " +
          engagementStatusLabel(conflict.status).toLowerCase() +
          " engagement for " +
          periodLabel(conflict) +
          ". " +
          resolution,
      );
      return;
    }

    const activePrimary = engagements.find(
      (engagement) =>
        engagement.status === "ACTIVE" && engagement.isPrimary,
    );
    if (values.isPrimary && activePrimary) {
      setSubmitError(
        "This worker already has a primary engagement. Unmark Primary, or terminate the current primary engagement first.",
      );
      return;
    }

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
          setSubmitError(null);
          setExpanded(false);
          onSuccess();
        },
        onError: (error) => setSubmitError(getErrorMessage(error)),
      },
    );
  }

  function handleCancel() {
    setExpanded(false);
    setSubmitError(null);
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
      {submitError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      ) : null}
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
          canManage={canManage}
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
              engagements={rows}
              onSuccess={handleEngagementAdded}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
