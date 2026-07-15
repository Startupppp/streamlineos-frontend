"use client";

import { useMemo } from "react";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";

import { TERMINATION_REASONS, TERMINATION_REASON_OTHER } from "@/lib/constants/hr-separation";
import type { Employee } from "@/types/hr";

function buildLetterPreview(params: {
  employeeName: string;
  designation: string;
  effectiveDate: string;
  reason: string;
  remarks: string;
  noticePeriodWaived: boolean;
  severanceAmount: string;
}): string {
  const {
    employeeName,
    designation,
    effectiveDate,
    reason,
    remarks,
    noticePeriodWaived,
    severanceAmount,
  } = params;

  const dateStr = effectiveDate
    ? format(new Date(effectiveDate), "MMMM d, yyyy")
    : "[Date not set]";
  const reasonDisplay = reason || "[No reason selected]";
  const severanceLine =
    severanceAmount && Number(severanceAmount) > 0
      ? `\nSeverance Amount: ₹${Number(severanceAmount).toLocaleString("en-IN")}`
      : "";
  const noticeLine = noticePeriodWaived
    ? "\nNote: Notice period has been waived."
    : "";

  return `TERMINATION LETTER

Dear ${employeeName || "[Employee Name]"},

This letter serves as formal notice of the termination of your employment as ${designation || "[Designation]"} with our organization, effective ${dateStr}.

Reason for Termination:
${reasonDisplay}

Remarks:
${remarks || "[No remarks provided]"}
${severanceLine}${noticeLine}

Please ensure all company property, access credentials, and pending deliverables are handed over before your last working day.

Regards,
Human Resources Department`;
}

interface TerminationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCEO: boolean;
  isPending: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
  employees: Employee[];
  selectedUserId: string;
  onSelectedUserIdChange: (value: string) => void;
  selectedReason: string;
  onSelectedReasonChange: (value: string) => void;
  remarks: string;
  onRemarksChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  effectiveDate: string;
  onEffectiveDateChange: (value: string) => void;
  noticePeriodWaived: boolean;
  onNoticePeriodWaivedChange: (checked: boolean) => void;
  severanceAmount: string;
  onSeveranceAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  internalNotes: string;
  onInternalNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function TerminationFormSheet({
  open,
  onOpenChange,
  isCEO,
  isPending,
  submitDisabled = false,
  onSubmit,
  employees,
  selectedUserId,
  onSelectedUserIdChange,
  selectedReason,
  onSelectedReasonChange,
  remarks,
  onRemarksChange,
  effectiveDate,
  onEffectiveDateChange,
  noticePeriodWaived,
  onNoticePeriodWaivedChange,
  severanceAmount,
  onSeveranceAmountChange,
  internalNotes,
  onInternalNotesChange,
}: TerminationFormSheetProps) {
  const isOtherReason = selectedReason === TERMINATION_REASON_OTHER;

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedUserId) ?? null,
    [employees, selectedUserId]
  );

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((emp) => emp.role !== "CEO" && emp.isActive)
        .map((emp) => {
          const label =
            emp.firstName && emp.lastName
              ? `${emp.firstName} ${emp.lastName}`
              : (emp.name ?? emp.email);
          return { value: emp.id, label, sublabel: emp.designation ?? emp.email };
        }),
    [employees]
  );

  const letterPreview = useMemo(
    () =>
      buildLetterPreview({
        employeeName: selectedEmployee?.name ?? "",
        designation: selectedEmployee?.designation ?? "",
        effectiveDate,
        reason: selectedReason,
        remarks,
        noticePeriodWaived,
        severanceAmount,
      }),
    [selectedEmployee, effectiveDate, selectedReason, remarks, noticePeriodWaived, severanceAmount]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Termination"
      description={
        isCEO
          ? "Create a termination record. As CEO, this will be automatically approved."
          : "Create a termination record. It will be saved as a draft for CEO approval."
      }
      onSubmit={onSubmit}
      submitLabel={isCEO ? "Create & Approve" : "Save as Draft"}
      isPending={isPending}
      submitDisabled={submitDisabled}
    >
      <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800/50 dark:bg-rose-950/20 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
          Sensitive Action
        </p>
        <p className="text-[11px] text-rose-600/80 dark:text-rose-400/70 mt-0.5">
          Termination records are permanent and will initiate the offboarding process once approved.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Employee
        </p>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Select Employee <span className="text-rose-500">*</span>
          </Label>
          <Combobox
            options={employeeOptions}
            value={selectedUserId}
            onChange={onSelectedUserIdChange}
            placeholder="Select an employee…"
            searchPlaceholder="Search by name…"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Termination Details
        </p>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Termination Reason <span className="text-rose-500">*</span>
          </Label>
          <Select value={selectedReason} onValueChange={onSelectedReasonChange}>
            <SelectTrigger aria-label="Select termination reason">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {TERMINATION_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Remarks{" "}
            {isOtherReason ? (
              <span className="text-rose-500">*</span>
            ) : (
              <span className="text-muted-foreground font-normal">(optional)</span>
            )}
          </Label>
          {isOtherReason && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Required: Describe the specific reason for selecting &apos;Other&apos; (min. 10 characters).
            </p>
          )}
          <Textarea
            placeholder={
              isOtherReason
                ? "Describe the specific reason (min. 10 characters)..."
                : "Additional remarks or context..."
            }
            value={remarks}
            onChange={onRemarksChange}
            rows={4}
            maxLength={2000}
            className="resize-none w-full"
            aria-label="Remarks"
          />
          {isOtherReason && (
            <p className="text-[11px] text-muted-foreground">
              {remarks.length} / 10 min characters
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Effective Date <span className="text-rose-500">*</span>
          </Label>
          <DatePicker value={effectiveDate ?? ""} onChange={onEffectiveDateChange} placeholder="Pick a date" className="text-sm" fromDate={new Date()} />
          <p className="text-[11px] text-muted-foreground">
            Must be today or a future date.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Terms & Compensation
        </p>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Notice Period Waived</p>
            <p className="text-xs text-muted-foreground">
              Employee will not be required to serve notice period.
            </p>
          </div>
          <Switch
            checked={noticePeriodWaived}
            onCheckedChange={onNoticePeriodWaivedChange}
            aria-label="Notice period waived"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Severance Amount{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              type="number"
              min="0"
              max="9999999"
              step="0.01"
              placeholder="0"
              value={severanceAmount}
              onChange={onSeveranceAmountChange}
              className="pl-6"
              aria-label="Severance amount"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Internal Notes{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            placeholder="Notes visible only to HR and management..."
            value={internalNotes}
            onChange={onInternalNotesChange}
            rows={3}
            maxLength={1000}
            className="resize-none w-full"
            aria-label="Internal notes"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Letter Preview
        </p>
        <Textarea
          readOnly
          value={letterPreview}
          rows={12}
          className="font-mono text-[11px] bg-muted/40 resize-none"
          aria-label="Termination letter preview"
        />
        <p className="text-[11px] text-muted-foreground">
          Auto-generated preview based on the fields above. The final letter will be
          generated upon email send.
        </p>
      </div>
    </HrSheet>
  );
}
