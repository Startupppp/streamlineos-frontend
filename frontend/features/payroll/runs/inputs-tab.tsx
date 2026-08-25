"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/api/access";
import { useRunInputs, usePatchInput, useReimportInputs } from "@/hooks/api/payroll/run-inputs";
import type { RunInput, PayrollInputSource } from "@/types/payroll/runs";

const SOURCE_COLORS: Record<PayrollInputSource, string> = {
  ATTENDANCE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  LEAVE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  TIMESHEET: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  UPLOAD: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  MANUAL: "bg-muted text-muted-foreground border-border",
};

const overrideSchema = z.object({
  scheduledDays: z.string().optional(),
  paidDays: z.string().optional(),
  lopDays: z.string().optional(),
  overtimeHours: z.string().optional(),
  billableHours: z.string().optional(),
  reason: z.string().min(1, "Reason is required").max(500),
});
type OverrideForm = z.infer<typeof overrideSchema>;

function getWarningMessage(row: RunInput): string | null {
  if (row.isOverride) {
    return row.overrideReason ? `Override: ${row.overrideReason}` : "Manually overridden";
  }
  if (
    row.source === "TIMESHEET" &&
    (row.billableHours === undefined || row.billableHours === null || row.billableHours === "0")
  ) {
    return "No billable hours recorded for timesheet employee";
  }
  const paid = parseFloat(row.paidDays);
  const lop = parseFloat(row.lopDays);
  const scheduled = parseFloat(row.scheduledDays);
  if (Number.isFinite(paid) && Number.isFinite(lop) && Number.isFinite(scheduled)) {
    if (paid + lop > scheduled + 0.01) {
      return "Paid + LOP days exceed scheduled days";
    }
  }
  return null;
}

interface InputsTabProps {
  runId: number;
  isLocked?: boolean;
}

const COLUMNS: DataTableColumn<RunInput>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => (
      <TruncatedText text={row.userName ?? row.userId.slice(0, 8)} className="text-dense font-medium" />
    ),
  },
  {
    key: "source",
    header: "Source",
    cell: (row) => (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border ${SOURCE_COLORS[row.source]}`}
      >
        {row.source}
      </span>
    ),
  },
  {
    key: "scheduledDays",
    header: "Scheduled",
    cell: (row) => <span className="tabular-nums">{row.scheduledDays}</span>,
  },
  {
    key: "paidDays",
    header: "Paid",
    cell: (row) => <span className="tabular-nums">{row.paidDays}</span>,
  },
  {
    key: "lopDays",
    header: "LOP",
    cell: (row) => <span className="tabular-nums">{row.lopDays}</span>,
  },
  {
    key: "halfDays",
    header: "Half Days",
    cell: (row) => <span className="tabular-nums">{row.halfDays}</span>,
  },
  {
    key: "overtimeHours",
    header: "OT Hrs",
    cell: (row) => <span className="tabular-nums">{row.overtimeHours}</span>,
  },
  {
    key: "billableHours",
    header: "Billable Hrs",
    cell: (row) =>
      row.billableHours !== undefined && row.billableHours !== null ? (
        <span className="tabular-nums">{row.billableHours}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "warning",
    header: "Warning",
    cell: (row) => {
      const msg = getWarningMessage(row);
      if (!msg) return null;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px] text-dense">
              {msg}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];

export function InputsTab({ runId, isLocked }: InputsTabProps) {
  const [selectedInput, setSelectedInput] = useState<RunInput | null>(null);
  const [showReimport, setShowReimport] = useState(false);
  const canUpdate = useCan("payroll:runs:update");

  const { data: inputs, isLoading } = useRunInputs(runId);
  const patchMutation = usePatchInput(runId);
  const reimportMutation = useReimportInputs(runId);

  const form = useForm<OverrideForm>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { reason: "" },
  });

  function handleRowClick(row: RunInput) {
    if (!canUpdate || isLocked) return;
    setSelectedInput(row);
    form.reset({
      scheduledDays: row.scheduledDays,
      paidDays: row.paidDays,
      lopDays: row.lopDays,
      overtimeHours: row.overtimeHours,
      billableHours: row.billableHours ?? "",
      reason: "",
    });
  }

  function handleSheetClose() {
    setSelectedInput(null);
    form.reset();
  }

  function handleSubmit(values: OverrideForm) {
    if (!selectedInput) return;
    patchMutation.mutate(
      { inputId: selectedInput.id, body: values },
      {
        onSuccess: () => {
          toast.success("Input overridden");
          handleSheetClose();
        },
        onError: () => toast.error("Failed to update input"),
      },
    );
  }

  function handleReimportConfirm() {
    reimportMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(`Re-imported ${res.count} inputs`);
        setShowReimport(false);
      },
      onError: () => {
        toast.error("Re-import failed");
        setShowReimport(false);
      },
    });
  }

  function handleReimportRequest() {
    setShowReimport(true);
  }

  function handleReimportCancel() {
    setShowReimport(false);
  }

  return (
    <div className="space-y-3">
      {!isLocked && canUpdate && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleReimportRequest}>
            Re-import
          </Button>
        </div>
      )}
      <DataTable
        data={inputs ?? []}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        onRowClick={!isLocked && canUpdate ? handleRowClick : undefined}
        isLoading={isLoading}
        minWidth="900px"
        emptyState={
          <EmptyState
            compact
            title="No attendance inputs"
            description="Run will pull inputs on generation"
          />
        }
      />

      <Sheet open={!!selectedInput} onOpenChange={handleSheetClose}>
        <SheetContent className="p-0 flex flex-col sm:max-w-lg">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="text-sm font-semibold">Override Input</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <SheetBody className="px-6 py-4 space-y-3">
                <FormField
                  control={form.control}
                  name="scheduledDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Days</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 26" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paidDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Days</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 24" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lopDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LOP Days</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overtimeHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Hours</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billableHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billable Hours</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 160" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Reason for override" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </SheetBody>
              <div className="px-6 py-4 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSheetClose}>
                  Cancel
                </Button>
                <LoadingButton type="submit" size="sm" isPending={patchMutation.isPending} loadingText="Saving…">
                  Save Override
                </LoadingButton>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showReimport} onOpenChange={setShowReimport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-import attendance inputs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will drop all non-overridden inputs and re-pull from attendance,
              leave, and timesheet sources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reimportMutation.isPending} onClick={handleReimportCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                onClick={handleReimportConfirm}
                isPending={reimportMutation.isPending}
                loadingText="Re-importing…"
              >
                Re-import
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
