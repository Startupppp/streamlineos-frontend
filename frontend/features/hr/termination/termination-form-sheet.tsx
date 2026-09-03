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
import { HrSheet } from "@/components/shared/hr-sheet";

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
  canApproveExit: boolean;
  isPending: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
  employees: Employee[];
  selectedEmployeeUserId: string;
  onSelectedEmployeeUserIdChange: (employeeUserId: string) => void;
  selectedReason: string;
  onSelectedReasonChange: (value: string) => void;
  remarks: string;
  onRemarksChange: (inputEvent: React.ChangeEvent<HTMLTextAreaElement>) => void;
  effectiveDate: string;
  onEffectiveDateChange: (value: string) => void;
  noticePeriodWaived: boolean;
  onNoticePeriodWaivedChange: (checked: boolean) => void;
  severanceAmount: string;
  onSeveranceAmountChange: (inputEvent: React.ChangeEvent<HTMLInputElement>) => void;
  internalNotes: string;
  onInternalNotesChange: (inputEvent: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function TerminationFormSheet({
  open,
  onOpenChange,
  canApproveExit,
  isPending,
  submitDisabled = false,
  onSubmit,
  employees,
  selectedEmployeeUserId,
  onSelectedEmployeeUserIdChange,
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
    () =>
      employees.find(
        (employeeRecord) => employeeRecord.id === selectedEmployeeUserId,
      ) ?? null,
    [employees, selectedEmployeeUserId]
  );

  const employeeOptions = useMemo(
    () =>
      employees
        .filter(
          (employeeRecord) =>
            employeeRecord.role !== "FINAL" && employeeRecord.isActive,
        )
        .map((employeeRecord) => {
          const label =
            employeeRecord.firstName && employeeRecord.lastName
              ? `${employeeRecord.firstName} ${employeeRecord.lastName}`
              : (employeeRecord.name ?? employeeRecord.email);
          return {
            value: employeeRecord.id,
            label,
            sublabel: employeeRecord.designation ?? employeeRecord.email,
          };
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
        canApproveExit
          ? "Create a termination record. As FINAL, this will be automatically approved."
          : "Create a termination record. It will be saved as a draft for FINAL approval."
      }
      onSubmit={onSubmit}
      submitLabel={canApproveExit ? "Create & Approve" : "Save as Draft"}
      isPending={isPending}
      submitDisabled={submitDisabled}
    >
      <div className="rounded-lg border border-status-danger-rule bg-status-danger-surface px-3 py-2.5">
        <p className="text-dense font-semibold text-status-danger-ink">
          Sensitive Action
        </p>
        <p className="text-dense text-status-danger-ink mt-0.5">
          Termination records are permanent and will initiate the offboarding process once approved.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
          Employee
        </p>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Select Employee <span className="text-status-danger-ink">*</span>
          </Label>
          <Combobox
            options={employeeOptions}
            value={selectedEmployeeUserId}
            onChange={onSelectedEmployeeUserIdChange}
            placeholder="Select an employee…"
            searchPlaceholder="Search by name…"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
          Termination Details
        </p>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Termination Reason <span className="text-status-danger-ink">*</span>
          </Label>
          <Select value={selectedReason} onValueChange={onSelectedReasonChange}>
            <SelectTrigger aria-label="Select termination reason">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
              <span className="text-status-danger-ink">*</span>
            ) : (
              <span className="text-muted-foreground font-normal">(optional)</span>
            )}
          </Label>
          {isOtherReason && (
            <p className="text-dense text-status-warning-ink">
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
            <p className="text-dense text-muted-foreground">
              {remarks.length} / 10 min characters
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Effective Date <span className="text-status-danger-ink">*</span>
          </Label>
          <DatePicker value={effectiveDate ?? ""} onChange={onEffectiveDateChange} placeholder="Pick a date" className="text-sm" fromDate={new Date()} />
          <p className="text-dense text-muted-foreground">
            Must be today or a future date.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
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
        <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Letter Preview
        </p>
        <Textarea
          readOnly
          value={letterPreview}
          rows={12}
          className="font-mono text-dense bg-muted/40 resize-none"
          aria-label="Termination letter preview"
        />
        <p className="text-dense text-muted-foreground">
          Auto-generated preview based on the fields above. The final letter will be
          generated upon email send.
        </p>
      </div>
    </HrSheet>
  );
}
