"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

import { getErrorMessage } from "@/lib/get-error-message";
import { useInitiateOnboarding, useOnboardingStatus } from "@/hooks/api/hr/onboarding";
import { useHrEmployees,
  unwrapEmployees} from "@/hooks/api/hr";
import type { Employee, PaginatedEmployees } from "@/types/hr";

const schema = z.object({
  userId: z.string().min(1, "Please select an employee"),
});

type FormValues = z.infer<typeof schema>;

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
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { userId: "" } });
  const initiate = useInitiateOnboarding();
  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const { data: onboardingStatuses } = useOnboardingStatus();

  const employees = useMemo<Employee[]>(() => {
    if (!employeesRaw) return [];
    if (Array.isArray(employeesRaw)) return employeesRaw as Employee[];
    return (employeesRaw as PaginatedEmployees).data ?? [];
  }, [employeesRaw]);

  const initiatedUserIds = useMemo(
    () => new Set((onboardingStatuses ?? []).map((s) => s.userId)),
    [onboardingStatuses],
  );

  const employeeOptions = useMemo<ComboboxOption[]>(() =>
    employees
      .filter((e) => e.isActive && !initiatedUserIds.has(e.id))
      .map((e) => ({
        value: e.id,
        label: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : (e.name ?? e.email),
        sublabel: e.designation ?? e.employeeId ?? e.email,
      })),
    [employees, initiatedUserIds]
  );

  const onSubmit = useCallback(
    (data: FormValues) => {
      initiate.mutate(data.userId.trim(), {
        onSuccess: (result) => {
          toast.success(`Onboarding initiated — ${result.tasksCreated} tasks created`);
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [initiate, form, onOpenChange]
  );

  const handleSheetOpenChange = useCallback(
    (v: boolean) => {
      if (!v) form.reset();
      onOpenChange(v);
    },
    [form, onOpenChange]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={handleSheetOpenChange}
      title="Initiate Onboarding"
      description="Create an onboarding checklist for an employee using the active template."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={<StartOnboardingLabel />}
      isPending={initiate.isPending}
    >
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2 text-[12px] text-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Tasks will be created from the active onboarding template and assigned to the selected employee.
        </span>
      </div>

      <Form {...form}>
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-foreground">
                Employee <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  options={employeeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select an employee…"
                  searchPlaceholder="Search by name or designation…"
                />
              </FormControl>
              <p className="text-[11px] text-muted-foreground">
                Only active employees without an existing onboarding workflow are shown.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </HrSheet>
  );
}
