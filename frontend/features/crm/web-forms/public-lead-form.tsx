"use client";

import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordForm, type RecordFormValues } from "@/components/renderer/record-form";
import { usePublicLeadForm, useSubmitLeadForm } from "@/hooks/api/crm/web-forms";
import type { PublicLeadForm } from "@/hooks/api/crm/web-forms-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { webFormLeadLayout } from "@/lib/renderer/crm/settings/web-form-lead-layout";
import { safeRedirect, toLeadSubmission } from "./lead-form-schema";

interface PublicLeadFormProps {
  leadFormToken: string;
}

/** The page a visitor lands on from a shared or embedded web-form link. */
export function PublicLeadFormPage({ leadFormToken }: PublicLeadFormProps) {
  const form = usePublicLeadForm(leadFormToken);

  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-4 pt-8 sm:pt-12">
      <Card className="w-full max-w-lg p-6">
        {form.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : form.data ? (
          <LeadFormBody leadFormToken={leadFormToken} definition={form.data} />
        ) : (
          <div className="py-8 text-center">
            <h1 className="text-lg font-semibold">Form unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This form is no longer accepting responses, or the link is wrong.
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}

function LeadFormBody({
  leadFormToken,
  definition,
}: {
  leadFormToken: string;
  definition: PublicLeadForm;
}) {
  const submit = useSubmitLeadForm(leadFormToken);
  const layout = useMemo(() => webFormLeadLayout(definition), [definition]);

  const handleSubmit = (values: RecordFormValues) =>
    submit.mutate(toLeadSubmission(values), {
      onSuccess: (result) => {
        const target = safeRedirect(result.redirectUrl);
        if (target) window.location.assign(target);
      },
    });

  if (submit.isSuccess)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-status-success-ink" aria-hidden />
        <h1 className="text-lg font-semibold">{submit.data.message}</h1>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{definition.name}</h1>
      <RecordForm
        layout={layout}
        mode="create"
        onSubmit={handleSubmit}
        isSubmitting={submit.isPending}
        submitLabel="Submit"
      />
      {submit.error ? (
        <p role="alert" className="text-sm text-status-danger-ink">
          {getErrorMessage(submit.error)}
        </p>
      ) : null}
    </div>
  );
}
