"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { HrSheet } from "@/components/shared/hr-sheet";
import { Button } from "@/components/ui/button";
import { EmployeePicker } from "@/features/hr/shared/employee-picker";

import { getErrorMessage } from "@/lib/get-error-message";
import { useInitiateOnboarding, useInitiatedOnboardingUserIds } from "@/hooks/api/hr/onboarding";

const schema = z.object({
  userId: z.string().trim().min(1, "Please select an employee"),
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
  const {
    data: initiatedUserIds = [],
    isLoading: initiatedIdsLoading,
    isError: initiatedIdsError,
    refetch: refetchInitiatedIds,
  } = useInitiatedOnboardingUserIds(open);

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
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2 text-xs text-foreground">
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
                <EmployeePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={initiatedIdsLoading || initiatedIdsError}
                  placeholder="Select an employee…"
                  excludeUserIds={initiatedUserIds}
                />
              </FormControl>
              <p className="text-dense text-muted-foreground">
                Only active employees without an existing onboarding workflow are shown.
              </p>
              {initiatedIdsError ? (
                <p role="alert" className="text-xs text-destructive">
                  Could not check existing onboarding workflows.
                  <Button type="button" variant="link" size="sm" onClick={() => void refetchInitiatedIds()}>
                    Retry
                  </Button>
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </HrSheet>
  );
}
