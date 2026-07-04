"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { useRunEmployee, useAddAdjustment } from "@/hooks/api/payroll/run-employees";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { cn } from "@/lib/utils";
import type { CalculationSnapshotLine, SalaryComponentType } from "@/types/payroll/runs";

const adjustmentSchema = z.object({
  type: z.enum(["EARNING", "DEDUCTION"]),
  name: z.string().min(1).max(100),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Positive decimal required"),
  note: z.string().min(1).max(500),
});
type AdjustmentForm = z.infer<typeof adjustmentSchema>;

const CATEGORY_ORDER: SalaryComponentType[] = [
  "EARNING",
  "DEDUCTION",
  "EMPLOYER_CONTRIBUTION",
  "INFORMATIONAL",
];

const CATEGORY_LABELS: Record<SalaryComponentType, string> = {
  EARNING: "Earnings",
  DEDUCTION: "Deductions",
  EMPLOYER_CONTRIBUTION: "Employer Contributions",
  INFORMATIONAL: "Informational",
};

function LineItemRow({ line }: { line: CalculationSnapshotLine }) {
  const [expanded, setExpanded] = useState(false);

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20 cursor-pointer"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleToggle(); }}
        aria-expanded={expanded}
      >
        <span className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </span>
        <span className="flex-1 text-[11px] text-foreground">{line.name}</span>
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {formatMoney(line.amount)}
        </span>
      </div>
      {expanded && (
        <div className="px-8 py-2 bg-muted/10 border-t border-border text-[10px] text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground">Method: {line.calcMethod}</p>
          {line.explain.formula && <p>Formula: <code>{line.explain.formula}</code></p>}
          {line.explain.steps.map((step, i) => (
            <p key={i}>{step}</p>
          ))}
          {Object.entries(line.explain.inputs).map(([k, v]) => (
            <p key={k}><span className="text-foreground">{k}:</span> {v}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface BreakdownSheetProps {
  runId: number;
  runEmployeeId: number | null;
  onClose: () => void;
  isLocked?: boolean;
}

export function BreakdownSheet({
  runId,
  runEmployeeId,
  onClose,
  isLocked,
}: BreakdownSheetProps) {
  const [showAdjustment, setShowAdjustment] = useState(false);
  const canUpdate = useCan("payroll:runs:update");

  const { data, isLoading } = useRunEmployee(runId, runEmployeeId ?? 0);
  const addAdjustmentMutation = useAddAdjustment(runId, runEmployeeId ?? 0);

  const form = useForm<AdjustmentForm>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { type: "EARNING", name: "", amount: "", note: "" },
  });

  function handleAdjustmentOpen() {
    setShowAdjustment(true);
    form.reset({ type: "EARNING", name: "", amount: "", note: "" });
  }

  function handleAdjustmentClose() {
    setShowAdjustment(false);
    form.reset();
  }

  function handleAdjustmentSubmit(values: AdjustmentForm) {
    addAdjustmentMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Adjustment added");
        handleAdjustmentClose();
      },
      onError: () => toast.error("Failed to add adjustment"),
    });
  }

  const snapshot = data?.calculationSnapshot;
  const linesByCategory = snapshot?.lines.reduce<
    Partial<Record<SalaryComponentType, CalculationSnapshotLine[]>>
  >((acc, line) => {
    if (!acc[line.category]) acc[line.category] = [];
    acc[line.category]!.push(line);
    return acc;
  }, {});

  return (
    <>
      <Sheet open={runEmployeeId !== null} onOpenChange={onClose}>
        <SheetContent className="p-0 flex flex-col sm:max-w-2xl">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="text-sm font-semibold">
              Salary Breakdown — {data?.userName ?? "Employee"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : !snapshot ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No calculation snapshot available
              </div>
            ) : (
              <div className="divide-y divide-border">
                {CATEGORY_ORDER.map((category) => {
                  const lines = linesByCategory?.[category];
                  if (!lines || lines.length === 0) return null;
                  const categoryTotal = lines.reduce(
                    (sum, l) => sum + parseFloat(l.amount),
                    0,
                  );
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          {CATEGORY_LABELS[category]}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {formatMoney(categoryTotal.toFixed(2))}
                        </span>
                      </div>
                      {lines
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((line) => (
                          <LineItemRow key={line.code} line={line} />
                        ))}
                    </div>
                  );
                })}

                <div className="px-3 py-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Gross</span>
                    <span className="font-mono tabular-nums">{formatMoney(snapshot.totals.gross)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Deductions</span>
                    <span className="font-mono tabular-nums text-red-600">
                      −{formatMoney(snapshot.totals.deductions)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold border-t pt-1.5 mt-1">
                    <span>Net Pay</span>
                    <span className="font-mono tabular-nums">{formatMoney(snapshot.totals.net)}</span>
                  </div>
                </div>

                {snapshot.variance && snapshot.variance.previousNet !== null && (
                  <div className="px-3 py-2 bg-muted/20 text-[11px]">
                    <span className="text-muted-foreground">vs prev: </span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(snapshot.variance.previousNet)}
                    </span>
                    {snapshot.variance.netDelta !== null && (
                      <span
                        className={cn(
                          "ml-2 font-mono",
                          parseFloat(snapshot.variance.netDelta) >= 0
                            ? "text-emerald-600"
                            : "text-red-600",
                        )}
                      >
                        {parseFloat(snapshot.variance.netDelta) >= 0 ? "+" : ""}
                        {formatMoney(snapshot.variance.netDelta)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isLocked && canUpdate && (
            <div className="px-6 py-4 border-t shrink-0">
              <Button size="sm" variant="outline" onClick={handleAdjustmentOpen}>
                Add Adjustment
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showAdjustment} onOpenChange={handleAdjustmentClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Adjustment</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAdjustmentSubmit)} className="space-y-3 py-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EARNING">Earning</SelectItem>
                        <SelectItem value="DEDUCTION">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Bonus, Advance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 5000.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Reason for adjustment" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={handleAdjustmentClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addAdjustmentMutation.isPending}>
                  Add
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
