"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Form } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useReportingManagerPolicy, useUpdateReportingManagerPolicy } from "@/hooks/api/hr/reporting-manager-policy";
import type { ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";
import { PolicyMissingBanner } from "@/components/hr/reporting-lines/policy-missing-banner";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { ReportingManagerPolicyFormFields } from "./reporting-manager-policy-form-fields";
import {
  policyPatch,
  policyToFormValues,
  reportingManagerPolicyFormSchema,
  type ReportingManagerPolicyFormValues,
} from "./reporting-manager-policy-schema";

export const REPORTING_MANAGER_POLICY_TITLE = "Reporting managers";
const SUBTITLE = "Who an employee reports to when onboarding or an import leaves the manager blank";

export function ReportingManagerPolicySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

function PrimaryVersusAdditional() {
  return (
    <section aria-labelledby="reporting-policy-explainer" className="rounded-xl border border-border bg-card p-4">
      <h2 id="reporting-policy-explainer" className="text-sm font-semibold">Primary and additional managers</h2>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
        <li>
          Every employee who is not a top-level role has exactly one <span className="font-medium text-foreground">primary reporting manager</span>.
          They approve leave, attendance, expenses, probation and performance, and take exit handovers.
        </li>
        <li>
          <span className="font-medium text-foreground">Additional reporting managers</span> are dotted-line contacts. They appear on the profile and org views but never approve anything.
        </li>
        <li>Changing a manager affects future approvals only; requests already waiting keep the approver they have.</li>
      </ul>
    </section>
  );
}

interface PolicyFormProps {
  policy: ReportingManagerPolicy;
  onConflict: () => void;
}

function PolicyForm({ policy, onConflict }: PolicyFormProps) {
  const canEdit = useCan("hr:reporting-lines:override");
  const update = useUpdateReportingManagerPolicy();
  const form = useForm<ReportingManagerPolicyFormValues>({
    resolver: zodResolver(reportingManagerPolicyFormSchema),
    defaultValues: policyToFormValues(policy),
  });

  // A newer version (ours after save, or someone else's after a conflict) resets the form.
  useEffect(() => {
    form.reset(policyToFormValues(policy));
  }, [policy, form]);

  function handleSubmit(values: ReportingManagerPolicyFormValues) {
    update.mutate(policyPatch(policy, values), {
      onSuccess: () => toast.success("Reporting manager policy saved"),
      onError: (error) => {
        if (isApiError(error) && error.status === 409) {
          toast.error("Someone else changed this policy. It has been reloaded — review it and save again.");
          onConflict();
          return;
        }
        toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {!canEdit ? (
          <p className="text-sm text-muted-foreground">You can view this policy. Changing it needs an HR or org admin.</p>
        ) : null}
        <ReportingManagerPolicyFormFields form={form} defaultManager={policy.defaultPrimaryManager} readOnly={!canEdit} />
        {canEdit ? (
          <div className="flex justify-end">
            <LoadingButton type="submit" isPending={update.isPending} disabled={!form.formState.isDirty}>
              Save policy
            </LoadingButton>
          </div>
        ) : null}
      </form>
    </Form>
  );
}

export function ReportingManagerPolicyPage() {
  const { data, isLoading, isError, error, refetch } = useReportingManagerPolicy();
  const pageState = usePageState({ permission: "hr:reporting-lines:manage", module: "hr", isLoading, isError, error });

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper title={REPORTING_MANAGER_POLICY_TITLE} subtitle={SUBTITLE}>
      <PageState resolution={pageState} loading={<ReportingManagerPolicySkeleton />} onRetry={handleRetry} className="flex-1">
        {data ? (
          <div className="flex flex-col gap-4">
            <PolicyMissingBanner context="form" />
            <PrimaryVersusAdditional />
            <PolicyForm policy={data} onConflict={handleRetry} />
          </div>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
