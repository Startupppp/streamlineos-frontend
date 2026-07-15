"use client";

import { useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePreviewTemplate, usePayrollPolicyCurrent } from "@/hooks/api/payroll";
import { formatMoney } from "./payroll-format";
import type { TemplateRow, PreviewLine } from "@/types/payroll/setup";
import { cn } from "@/lib/utils";

type TemplatePreviewSheetProps = {
  template: TemplateRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleOverrides?: Record<string, boolean>;
};

const TYPE_LABELS: Record<PreviewLine["type"], string> = {
  EARNING: "Earnings",
  DEDUCTION: "Deductions",
  EMPLOYER_CONTRIBUTION: "Employer Contributions",
  REIMBURSEMENT: "Reimbursements",
  TAX: "Taxes",
  ADJUSTMENT: "Adjustments",
};

export function TemplatePreviewSheet({
  template,
  open,
  onOpenChange,
  toggleOverrides,
}: TemplatePreviewSheetProps) {
  const [ctcInput, setCtcInput] = useState("1200000");
  const preview = usePreviewTemplate();
  const { data: policyData } = usePayrollPolicyCurrent();
  const currency = policyData?.policy?.currency ?? "INR";

  function handleCtcChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCtcInput(e.target.value);
  }

  function handlePreview() {
    if (!template) return;
    preview.mutate({ templateId: template.id, annualCtc: ctcInput, toggleOverrides });
  }
  const previewData = preview.data;
  const groups = previewData
    ? Object.entries(TYPE_LABELS).reduce<Record<string, PreviewLine[]>>((acc, [type, label]) => {
        const lines = previewData.components.filter((c) => c.type === type);
        if (lines.length > 0) acc[label] = lines;
        return acc;
      }, {})
    : {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle className="text-base">{template?.name} — Preview</SheetTitle>
            <SheetDescription className="text-xs">
              Estimated monthly breakdown at your target CTC
            </SheetDescription>
          </SheetHeader>
        </div>

        <SheetBody className="px-6 py-4 space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="preview-ctc" className="text-xs">Annual CTC ({currency})</Label>
              <Input
                id="preview-ctc"
                value={ctcInput}
                onChange={handleCtcChange}
                placeholder="1200000"
                className="h-8 text-sm font-mono"
              />
            </div>
            <Button onClick={handlePreview} disabled={preview.isPending} size="sm">
              {preview.isPending ? "Calculating…" : "Calculate"}
            </Button>
          </div>

          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Monthly CTC</span>
                <span className="font-mono font-medium text-foreground">
                  {formatMoney(previewData.monthlyCtc, currency)}
                </span>
              </div>

              {Object.entries(groups).map(([groupLabel, lines]) => (
                <div key={groupLabel} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    {groupLabel}
                  </p>
                  <div className="rounded-md border border-border overflow-hidden">
                    {lines.map((line, i) => (
                      <div
                        key={line.code}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 text-xs",
                          i > 0 && "border-t border-border",
                        )}
                      >
                        <div>
                          <p className="font-medium">{line.name}</p>
                          {line.explain && (
                            <p className="text-muted-foreground text-[10px]">{line.explain}</p>
                          )}
                        </div>
                        <span className="font-mono tabular-nums shrink-0 ml-2">
                          {formatMoney(line.monthlyAmount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-md bg-muted p-3 space-y-1.5">
                {[
                  { label: "Gross Pay", value: previewData.totals.grossEarnings },
                  { label: "Total Deductions", value: previewData.totals.totalDeductions },
                  { label: "Employer Contributions", value: previewData.totals.employerContributions },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-mono tabular-nums">{formatMoney(row.value, currency)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-border/50 mt-1">
                  <span>Net Pay</span>
                  <span className="font-mono tabular-nums">{formatMoney(previewData.totals.netTakeHome, currency)}</span>
                </div>
              </div>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
