"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

import { Label } from "@/components/ui/label";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

import { getErrorMessage } from "@/lib/get-error-message";
import { useInitiateOnboarding } from "@/hooks/api/hr/onboarding";
import { useHrEmployees } from "@/hooks/api/hr";
import type { Employee, PaginatedEmployees } from "@/types/hr";

function StartOnboardingLabel() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <span className="flex items-center gap-1.5" {...hoverHandlers}>
      <UserPlusIcon ref={iconRef} size={14} />
      Start Onboarding
    </span>
  );
}

interface OnboardingInitiateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingInitiateSheet({ open, onOpenChange }: OnboardingInitiateSheetProps) {
  const [userId, setUserId] = useState("");
  const initiate = useInitiateOnboarding();
  const { data: employeesRaw } = useHrEmployees({ limit: 500 });

  const employees = useMemo<Employee[]>(() => {
    if (!employeesRaw) return [];
    if (Array.isArray(employeesRaw)) return employeesRaw as Employee[];
    return (employeesRaw as PaginatedEmployees).data ?? [];
  }, [employeesRaw]);

  const employeeOptions = useMemo<ComboboxOption[]>(() =>
    employees
      .filter((e) => e.isActive)
      .map((e) => ({
        value: e.id,
        label: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : (e.name ?? e.email),
        sublabel: e.designation ?? e.employeeId ?? e.email,
      })),
    [employees]
  );

  const handleSubmit = useCallback(() => {
    if (!userId.trim()) {
      toast.error("Please select an employee");
      return;
    }
    initiate.mutate(userId.trim(), {
      onSuccess: (data) => {
        toast.success(`Onboarding initiated — ${data.tasksCreated} tasks created`);
        setUserId("");
        onOpenChange(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [userId, initiate, onOpenChange]);

  const handleSheetOpenChange = useCallback(
    (v: boolean) => {
      if (!v) setUserId("");
      onOpenChange(v);
    },
    [onOpenChange]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="Initiate Onboarding"
      description="Create an onboarding checklist for an employee using the active template."
      onSubmit={handleSubmit}
      submitLabel={<StartOnboardingLabel />}
      isPending={initiate.isPending}
    >
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2 text-[12px] text-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Tasks will be created from the active onboarding template and assigned to the selected employee.
        </span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-foreground">
          Employee <span className="text-destructive">*</span>
        </Label>
        <Combobox
          options={employeeOptions}
          value={userId}
          onChange={setUserId}
          placeholder="Select an employee…"
          searchPlaceholder="Search by name or designation…"
        />
        <p className="text-[11px] text-muted-foreground">
          Only active employees without an existing onboarding workflow are shown.
        </p>
      </div>
    </HrSheet>
  );
}
