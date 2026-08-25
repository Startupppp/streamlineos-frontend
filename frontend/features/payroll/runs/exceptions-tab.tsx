"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/hooks/api/access";
import { useRunExceptions, useResolveException, useOverrideException } from "@/hooks/api/payroll/run-exceptions";
import type { PayrollException, PayrollExceptionSeverity, PayrollExceptionStatus } from "@/types/payroll/runs";

const SEVERITY_CONFIG: Record<
  PayrollExceptionSeverity,
  { className: string; label: string }
> = {
  BLOCKER: { className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule", label: "Blocker" },
  WARNING: { className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule", label: "Warning" },
  INFO: { className: "bg-status-info-surface text-status-info-ink border-status-info-rule", label: "Info" },
};

const STATUS_CONFIG: Record<PayrollExceptionStatus, { className: string; label: string }> = {
  OPEN: { className: "bg-muted text-muted-foreground border-border", label: "Open" },
  RESOLVED: { className: "bg-status-success-surface text-status-success-ink border-status-success-rule", label: "Resolved" },
  OVERRIDDEN: { className: "bg-muted text-muted-foreground border-border", label: "Overridden" },
};

const overrideSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});
type OverrideForm = z.infer<typeof overrideSchema>;

interface ExceptionsTabProps {
  runId: number;
  isLocked?: boolean;
}

export function ExceptionsTab({ runId, isLocked }: ExceptionsTabProps) {
  const [filterSeverity, setFilterSeverity] = useState<PayrollExceptionSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<PayrollExceptionStatus | "all">("all");
  const [overrideTarget, setOverrideTarget] = useState<PayrollException | null>(null);
  const canUpdate = useCan("payroll:runs:update");
  const canManage = useCan("payroll:runs:manage");

  const { data: exceptions, isLoading } = useRunExceptions(
    runId,
    filterSeverity !== "all" || filterStatus !== "all"
      ? {
          severity: filterSeverity !== "all" ? filterSeverity : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
        }
      : undefined,
  );

  const resolveMutation = useResolveException(runId);
  const overrideMutation = useOverrideException(runId);

  const form = useForm<OverrideForm>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { reason: "" },
  });

  const grouped = (exceptions ?? []).reduce<Record<PayrollExceptionSeverity, PayrollException[]>>(
    (acc, ex) => {
      acc[ex.severity].push(ex);
      return acc;
    },
    { BLOCKER: [], WARNING: [], INFO: [] },
  );

  function handleResolve(ex: PayrollException) {
    resolveMutation.mutate(
      { exceptionId: ex.id },
      {
        onSuccess: () => toast.success("Exception resolved"),
        onError: () => toast.error("Failed to resolve"),
      },
    );
  }

  function handleOverrideRequest(ex: PayrollException) {
    setOverrideTarget(ex);
    form.reset({ reason: "" });
  }

  function handleOverrideCancel() {
    setOverrideTarget(null);
    form.reset();
  }

  function handleOverrideSubmit(values: OverrideForm) {
    if (!overrideTarget) return;
    overrideMutation.mutate(
      { exceptionId: overrideTarget.id, reason: values.reason },
      {
        onSuccess: () => {
          toast.success("Exception overridden");
          handleOverrideCancel();
        },
        onError: () => toast.error("Failed to override"),
      },
    );
  }

  function handleSeverityChange(val: string) {
    setFilterSeverity(val as PayrollExceptionSeverity | "all");
  }

  function handleStatusChange(val: string) {
    setFilterStatus(val as PayrollExceptionStatus | "all");
  }

  const allEmpty = !isLoading && (exceptions ?? []).length === 0;

  return (
    <div className="space-y-3">
      <div className={FILTER_TOOLBAR_ROW}>
        <Select value={filterSeverity} onValueChange={handleSeverityChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`}>
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="BLOCKER">Blocker</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-32`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="OVERRIDDEN">Overridden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {allEmpty && (
        <EmptyState
          title="No exceptions — clean run"
          description="All employees passed validation checks"
          className="border-status-success-rule bg-status-success-surface"
        />
      )}

      {(["BLOCKER", "WARNING", "INFO"] as PayrollExceptionSeverity[]).map((severity) => {
        const rows = grouped[severity];
        if (rows.length === 0) return null;
        const cfg = SEVERITY_CONFIG[severity];
        return (
          <div key={severity} className="space-y-1">
            <div className="flex items-center gap-2 px-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-micro font-medium border ${cfg.className}`}
              >
                {cfg.label}
              </span>
              <span className="text-dense text-muted-foreground">{rows.length}</span>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              {rows.map((ex, idx) => {
                const stCfg = STATUS_CONFIG[ex.status];
                return (
                  <div
                    key={ex.id}
                    className={`flex items-center gap-3 px-3 py-2 text-dense ${idx > 0 ? "border-t border-border" : ""}`}
                  >
                    <span className="font-mono text-micro text-muted-foreground shrink-0">
                      {ex.code}
                    </span>
                    <TruncatedText text={ex.message ?? ""} className="flex-1 text-foreground min-w-0" />
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border shrink-0 ${stCfg.className}`}
                    >
                      {stCfg.label}
                    </span>
                    {!isLocked && ex.status === "OPEN" && (
                      <div className="flex items-center gap-1 shrink-0">
                        {canUpdate && (
                          <LoadingButton
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-micro"
                            onClick={() => handleResolve(ex)}
                            isPending={resolveMutation.isPending}
                          >
                            Resolve
                          </LoadingButton>
                        )}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-micro text-status-warning-ink"
                            onClick={() => handleOverrideRequest(ex)}
                          >
                            Override
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <AlertDialog open={!!overrideTarget} onOpenChange={handleOverrideCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Override exception</AlertDialogTitle>
            <AlertDialogDescription>
              You are overriding a {overrideTarget?.severity} exception: {overrideTarget?.code}.
              Provide a reason for the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOverrideSubmit)}>
              <div className="py-3">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Explain why this exception is being overridden" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={overrideMutation.isPending} onClick={handleOverrideCancel}>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <LoadingButton type="submit" isPending={overrideMutation.isPending} loadingText="Overriding…">
                    Override
                  </LoadingButton>
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
