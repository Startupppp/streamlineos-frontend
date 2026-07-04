"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCan } from "@/hooks/api/access";
import { useRunInputs, usePatchInput, useReimportInputs } from "@/hooks/api/payroll/run-inputs";
import type { RunInput, PayrollInputSource } from "@/types/payroll/runs";

const SOURCE_COLORS: Record<PayrollInputSource, string> = {
  ATTENDANCE: "bg-blue-50 text-blue-700 border-blue-200",
  LEAVE: "bg-violet-50 text-violet-700 border-violet-200",
  TIMESHEET: "bg-cyan-50 text-cyan-700 border-cyan-200",
  UPLOAD: "bg-amber-50 text-amber-700 border-amber-200",
  MANUAL: "bg-slate-100 text-slate-600 border-slate-200",
};

const overrideSchema = z.object({
  scheduledDays: z.string().optional(),
  paidDays: z.string().optional(),
  lopDays: z.string().optional(),
  overtimeHours: z.string().optional(),
  reason: z.string().min(1, "Reason is required").max(500),
});
type OverrideForm = z.infer<typeof overrideSchema>;

interface InputsTabProps {
  runId: number;
  isLocked?: boolean;
}

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

  const columns: DataTableColumn<RunInput>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <span className="text-[11px] font-medium">{row.userName ?? row.userId.slice(0, 8)}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${SOURCE_COLORS[row.source]}`}
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
      key: "override",
      header: "Override",
      cell: (row) =>
        row.isOverride ? (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
            title={row.overrideReason ?? ""}
          >
            Manual
          </span>
        ) : null,
    },
  ];

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
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={!isLocked && canUpdate ? handleRowClick : undefined}
        isLoading={isLoading}
        minWidth="700px"
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
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
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
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSheetClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={patchMutation.isPending}>
                  Save Override
                </Button>
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
            <AlertDialogCancel onClick={handleReimportCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReimportConfirm}
              disabled={reimportMutation.isPending}
            >
              Re-import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
