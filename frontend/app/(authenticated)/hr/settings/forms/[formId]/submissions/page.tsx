"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrForm } from "@/features/hr/forms/hooks/use-hr-forms";
import { useHrFormSubmissions } from "@/features/hr/forms/hooks/use-hr-form-submissions";
import { SubmissionsDataTable } from "@/features/hr/forms/components/submissions-data-table";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default function HrFormSubmissionsPage({ params }: PageProps) {
  const { formId: formIdStr } = use(params);
  const formId = parseInt(formIdStr, 10);
  const { data: form, isLoading: formLoading } = useHrForm(formId);
  const { data: subs, isLoading: subsLoading } = useHrFormSubmissions(formId);

  const isLoading = formLoading || subsLoading;

  return (
    <PageWrapper
      title={form ? `${form.name} — Submissions` : "Submissions"}
      subtitle={`${subs?.total ?? 0} total submissions`}
      backHref={`/hr/settings/forms/${formId}`}
    >
      {isLoading ? (
        <div className="space-y-2 pt-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="pt-2">
          <SubmissionsDataTable
            formId={formId}
            submissions={subs?.data ?? []}
            canManage
          />
        </div>
      )}
    </PageWrapper>
  );
}
