"use client";

import { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { HrSheet } from "@/features/hr/hr-sheet";

import { useCreateTermination } from "@/lib/api/hooks/hr";
import type { Employee } from "@/types/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { TERMINATION_REASONS } from "@/lib/constants/hr-separation";

import { buildLetterPreview } from "./termination-utils";

interface CreateTerminationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  selectedUserId: string;
  setSelectedUserId: Dispatch<SetStateAction<string>>;
  selectedReasons: string[];
  setSelectedReasons: Dispatch<SetStateAction<string[]>>;
  explanation: string;
  setExplanation: Dispatch<SetStateAction<string>>;
  effectiveDate: string;
  setEffectiveDate: Dispatch<SetStateAction<string>>;
  noticePeriodWaived: boolean;
  setNoticePeriodWaived: Dispatch<SetStateAction<boolean>>;
  severanceAmount: string;
  setSeveranceAmount: Dispatch<SetStateAction<string>>;
  internalNotes: string;
  setInternalNotes: Dispatch<SetStateAction<string>>;
  onReset: () => void;
}

export function CreateTerminationSheet({
  open,
  onOpenChange,
  employees,
  selectedUserId,
  setSelectedUserId,
  selectedReasons,
  setSelectedReasons,
  explanation,
  setExplanation,
  effectiveDate,
  setEffectiveDate,
  noticePeriodWaived,
  setNoticePeriodWaived,
  severanceAmount,
  setSeveranceAmount,
  internalNotes,
  setInternalNotes,
  onReset,
}: CreateTerminationSheetProps) {
  const createTermination = useCreateTermination();

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedUserId) ?? null,
    [employees, selectedUserId]
  );

  const letterPreview = useMemo(
    () =>
      buildLetterPreview({
        employeeName: selectedEmployee?.name ?? "",
        designation: selectedEmployee?.designation ?? "",
        effectiveDate,
        reasons: selectedReasons,
        explanation,
        noticePeriodWaived,
        severanceAmount,
      }),
    [selectedEmployee, effectiveDate, selectedReasons, explanation, noticePeriodWaived, severanceAmount]
  );

  const handleToggleReason = useCallback((reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  }, [setSelectedReasons]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) onReset();
    },
    [onOpenChange, onReset]
  );

  const handleExplanationChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value),
    [setExplanation]
  );

  const handleEffectiveDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEffectiveDate(e.target.value),
    [setEffectiveDate]
  );

  const handleSeveranceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSeveranceAmount(e.target.value),
    [setSeveranceAmount]
  );

  const handleInternalNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInternalNotes(e.target.value),
    [setInternalNotes]
  );

  const handleCreateSubmit = useCallback(() => {
    if (!selectedUserId) {
      toast.error("Please select an employee");
      return;
    }
    if (selectedReasons.length === 0) {
      toast.error("Please select at least one termination reason");
      return;
    }
    if (explanation.trim().length < 50) {
      toast.error("Detailed explanation must be at least 50 characters");
      return;
    }
    if (!effectiveDate) {
      toast.error("Please set an effective date");
      return;
    }

    createTermination.mutate(
      {
        userId: selectedUserId,
        reasons: selectedReasons,
        detailedExplanation: explanation.trim(),
        effectiveDate,
        severanceAmount: severanceAmount ? Number(severanceAmount) : undefined,
        noticePeriodWaived,
        internalNotes: internalNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Termination saved as draft");
          onOpenChange(false);
          onReset();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [
    selectedUserId,
    selectedReasons,
    explanation,
    effectiveDate,
    severanceAmount,
    noticePeriodWaived,
    internalNotes,
    createTermination,
    onOpenChange,
    onReset,
  ]);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="New Termination"
      description="Create a termination record. It will be saved as a draft."
      onSubmit={handleCreateSubmit}
      submitLabel="Save as Draft"
      isPending={createTermination.isPending}
    >
      {/* Employee select */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Employee <span className="text-destructive">*</span>
        </Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger aria-label="Select employee">
            <SelectValue placeholder="Select an employee..." />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                <span className="flex flex-col">
                  <span>{emp.name ?? "Unnamed"}</span>
                  {emp.designation && (
                    <span className="text-xs text-muted-foreground">
                      {emp.designation}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Termination Reasons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Termination Reasons <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {TERMINATION_REASONS.map((reason) => (
            <div key={reason} className="flex items-center gap-2">
              <Checkbox
                id={`reason-${reason}`}
                checked={selectedReasons.includes(reason)}
                onCheckedChange={() => handleToggleReason(reason)}
                aria-label={reason}
              />
              <Label
                htmlFor={`reason-${reason}`}
                className="text-xs font-normal cursor-pointer"
              >
                {reason}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Detailed explanation */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Detailed Explanation <span className="text-destructive">*</span>
        </Label>
        <Textarea
          placeholder="Minimum 50 characters. Describe the reasons and circumstances in detail..."
          value={explanation}
          onChange={handleExplanationChange}
          rows={4}
          aria-label="Detailed explanation"
        />
        <p className="text-[11px] text-muted-foreground">
          {explanation.length} / 50 min characters
        </p>
      </div>

      {/* Effective date */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Effective Date <span className="text-destructive">*</span>
        </Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={handleEffectiveDateChange}
          aria-label="Effective date"
        />
      </div>

      <Separator />

      {/* Notice period waived */}
      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Notice Period Waived</p>
          <p className="text-xs text-muted-foreground">
            Employee will not be required to serve notice period.
          </p>
        </div>
        <Switch
          checked={noticePeriodWaived}
          onCheckedChange={setNoticePeriodWaived}
          aria-label="Notice period waived"
        />
      </div>

      {/* Severance amount */}
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
            step="1000"
            placeholder="0"
            value={severanceAmount}
            onChange={handleSeveranceChange}
            className="pl-6"
            aria-label="Severance amount"
          />
        </div>
      </div>

      {/* Internal notes */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          Internal Notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          placeholder="Notes visible only to HR and management..."
          value={internalNotes}
          onChange={handleInternalNotesChange}
          rows={3}
          aria-label="Internal notes"
        />
      </div>

      <Separator />

      {/* Letter preview */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Letter Preview</Label>
        <Textarea
          readOnly
          value={letterPreview}
          rows={12}
          className="font-mono text-[11px] bg-muted/40 resize-none"
          aria-label="Termination letter preview"
        />
        <p className="text-[11px] text-muted-foreground">
          Auto-generated preview based on the fields above. The final letter will
          be generated upon email send.
        </p>
      </div>
    </HrSheet>
  );
}
