"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { FormBuilder } from "@/features/hr/forms/components/form-builder";
import { useHrForm, useUpdateHrForm } from "@/features/hr/forms/hooks/use-hr-forms";
import type { CreateHrFormPayload, UpdateHrFormPayload } from "@/features/hr/forms/lib/types";

interface HrFormBuilderContentProps {
  formId: number;
}

export function HrFormBuilderContent({ formId }: HrFormBuilderContentProps) {
  const { data: form, isLoading, isError, error, refetch } = useHrForm(formId);
  const update = useUpdateHrForm(formId);

  function handleRetry() {
    void refetch();
  }

  async function handleSave(payload: CreateHrFormPayload) {
    try {
      await update.mutateAsync(payload as UpdateHrFormPayload);
      toast.success("Form saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <PageWrapper title="Form Builder" backHref="/hr/settings/forms">
        <div className="flex flex-1 min-h-0 flex-col gap-3 pt-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Form Builder" backHref="/hr/settings/forms">
        <ErrorState
          className="flex-1"
          title="Couldn't load this form"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!form) {
    return (
      <PageWrapper title="Form Builder" backHref="/hr/settings/forms">
        <EmptyState
          illustrationPreset="documents"
          title="Form not found"
          description="This form no longer exists. It may have been deleted."
          action={{ label: "Back to forms", href: "/hr/settings/forms" }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={form.name}
      subtitle={`/${form.slug} · ${form.audience} · ${form.status}`}
      backHref="/hr/settings/forms"
    >
      <div className="pt-2 h-full min-h-0">
        <FormBuilder form={form} onSave={handleSave} isPending={update.isPending} />
      </div>
    </PageWrapper>
  );
}
