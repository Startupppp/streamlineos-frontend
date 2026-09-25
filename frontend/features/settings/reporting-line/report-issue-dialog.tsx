"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ManagerCandidatePicker } from "@/components/hr/reporting-lines/manager-candidate-picker";
import { useCreateReportingManagerRequest } from "@/hooks/api/hr/my-reporting-line";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  EMPLOYEE_REASON_MAX,
  reportingIssueSchema,
  toCreateRequestPayload,
  type ReportingIssueInput,
  type ReportingIssueValues,
} from "./reporting-issue-schema";

const DEFAULT_VALUES: ReportingIssueInput = { reason: "", suggestedManagerUserId: "", requestedEffectiveFrom: "" };

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentManagerName: string | null;
  onDuplicate: () => void;
}

export function ReportIssueDialog({ open, onOpenChange, currentManagerName, onDuplicate }: ReportIssueDialogProps) {
  const create = useCreateReportingManagerRequest();
  // Display only: keeps the suggested person's name once the picker's search moves on.
  const [suggested, setSuggested] = useState<ManagerRef | null>(null);

  function handleSubmit(values: ReportingIssueValues) {
    create.mutate(toCreateRequestPayload(values), {
      onSuccess: () => {
        toast.success("Sent your request to HR for review");
        onOpenChange(false);
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 409) {
          toast.error("You already have a request under review");
          onDuplicate();
          onOpenChange(false);
          return;
        }
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <EntityFormDialog<ReportingIssueInput, ReportingIssueValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Report an issue with your reporting line"
      description="HR reviews every request. Your reporting line does not change until HR approves."
      resolver={zodResolver(reportingIssueSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending}
      submitLabel="Send to HR"
      resetOnOpen
    >
      {(form) => {
        const reasonLength = form.watch("reason").trim().length;

        function handleSuggestedChange(userId: string | null, manager: ManagerRef | null) {
          form.setValue("suggestedManagerUserId", userId ?? "", { shouldDirty: true });
          setSuggested(manager);
        }

        return (
          <>
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-dense font-medium text-muted-foreground">Current primary reporting manager</span>
              <span>{currentManagerName ?? "No manager on record"}</span>
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is wrong?</FormLabel>
                  <FormControl>
                    <Textarea rows={4} maxLength={EMPLOYEE_REASON_MAX} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs tabular-nums">
                    {reasonLength} / {EMPLOYEE_REASON_MAX} characters (at least 20)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="suggestedManagerUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Who should you report to? (optional)</FormLabel>
                  <FormControl>
                    <ManagerCandidatePicker
                      source="self"
                      value={field.value || null}
                      onChange={handleSuggestedChange}
                      selected={suggested}
                      allowUnassigned
                      placeholder="Search for a colleague"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requestedEffectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From which date? (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      }}
    </EntityFormDialog>
  );
}
