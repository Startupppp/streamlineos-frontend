"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { FormBuilder } from "@/features/hr/forms/components/form-builder";
import { useHrForm, useUpdateHrForm } from "@/features/hr/forms/hooks/use-hr-forms";
import type { CreateHrFormPayload, UpdateHrFormPayload } from "@/features/hr/forms/lib/types";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default function HrFormBuilderPage({ params }: PageProps) {
  const { formId: formIdStr } = use(params);
  const formId = parseInt(formIdStr, 10);
  const { data: form, isLoading } = useHrForm(formId);
  const update = useUpdateHrForm(formId);

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

  if (!form) {
    return (
      <PageWrapper title="Form Builder" backHref="/hr/settings/forms">
        <p className="text-sm text-muted-foreground pt-4">Form not found.</p>
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
