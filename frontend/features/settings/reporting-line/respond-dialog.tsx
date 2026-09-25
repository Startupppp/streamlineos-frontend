"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useRespondReportingManagerRequest } from "@/hooks/api/hr/my-reporting-line";
import { getErrorMessage } from "@/lib/get-error-message";
import { EMPLOYEE_REASON_MAX, respondSchema, type RespondInput, type RespondValues } from "./reporting-issue-schema";

const DEFAULT_VALUES: RespondInput = { reason: "" };

interface RespondDialogProps {
  requestId: string | null;
  hrQuestion: string | null;
  onOpenChange: (open: boolean) => void;
}

export function RespondDialog({ requestId, hrQuestion, onOpenChange }: RespondDialogProps) {
  const respond = useRespondReportingManagerRequest();

  function handleSubmit(values: RespondValues) {
    if (!requestId) return;
    respond.mutate(
      { requestId, reason: values.reason },
      {
        onSuccess: () => {
          toast.success("Sent your reply to HR");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<RespondInput, RespondValues>
      open={requestId !== null}
      onOpenChange={onOpenChange}
      title="Reply to HR"
      description={hrQuestion ?? "HR asked for more information about your request."}
      resolver={zodResolver(respondSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={respond.isPending}
      submitLabel="Send reply"
      resetOnOpen
    >
      {(form) => (
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your reply</FormLabel>
              <FormControl>
                <Textarea rows={4} maxLength={EMPLOYEE_REASON_MAX} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}
