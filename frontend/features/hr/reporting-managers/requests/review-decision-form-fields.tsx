"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ManagerCandidatePicker } from "@/components/hr/reporting-lines/manager-candidate-picker";
import {
  REVIEW_DECISIONS,
  type HrReportingManagerRequest,
  type ReviewDecision,
} from "@/hooks/api/hr/reporting-manager-requests-schema";
import type { ManagerRef } from "@/hooks/api/hr/reporting-lines-schema";
import {
  DECISION_LABEL,
  DECISION_REASON_LABEL,
  type ReviewDecisionInput,
  type ReviewDecisionValues,
} from "./review-decision-schema";

interface ReviewDecisionFormFieldsProps {
  form: UseFormReturn<ReviewDecisionInput, unknown, ReviewDecisionValues>;
  request: HrReportingManagerRequest;
}

function isDecision(value: string): value is ReviewDecision {
  return REVIEW_DECISIONS.some((decision) => decision === value);
}

export function ReviewDecisionFormFields({ form, request }: ReviewDecisionFormFieldsProps) {
  const decision = form.watch("decision");
  // Display only: the picker needs the chosen person's name after its search moves on.
  const [chosen, setChosen] = useState<ManagerRef | null>(request.suggestedManager);

  function handleDecisionChange(value: string) {
    if (isDecision(value)) form.setValue("decision", value, { shouldValidate: form.formState.isSubmitted });
  }

  function handleManagerChange(userId: string | null, manager: ManagerRef | null) {
    form.setValue("managerUserId", userId ?? "", { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    setChosen(manager);
  }

  return (
    <>
      <FormField
        control={form.control}
        name="decision"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Decision</FormLabel>
            <FormControl>
              <RadioGroup value={field.value} onValueChange={handleDecisionChange} className="gap-2">
                {REVIEW_DECISIONS.map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
                    <RadioGroupItem value={option} />
                    {DECISION_LABEL[option]}
                  </label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {decision === "APPROVE" ? (
        <>
          <FormField
            control={form.control}
            name="managerUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New primary reporting manager</FormLabel>
                <FormControl>
                  <ManagerCandidatePicker
                    value={field.value || null}
                    onChange={handleManagerChange}
                    excludeUserId={request.employee.userId}
                    selected={chosen}
                    placeholder="Choose the new primary manager"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Changes future approval routing. Approvals already assigned keep their approver.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective from</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription className="text-xs">Leave blank to apply from today in your organisation.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ) : null}
      <FormField
        control={form.control}
        name="reviewReason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{DECISION_REASON_LABEL[decision]}</FormLabel>
            <FormControl>
              <Textarea rows={3} maxLength={1000} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
