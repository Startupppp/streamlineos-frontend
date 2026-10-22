import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { HrFormSubmissionsContent } from "@/features/hr/forms/components/hr-form-submissions-content";
import { prefetchHrFormSubmissions } from "@/lib/prefetch/hr-time";
import FormSubmissionsLoading from "./loading";

interface PageProps {
  params: Promise<{ formId: string }>;
}

async function FormSubmissionsHydrated({ formId }: { formId: number }) {
  const state = await prefetchHrFormSubmissions(formId);
  return (
    <HydrationBoundary state={state}>
      <HrFormSubmissionsContent formId={formId} />
    </HydrationBoundary>
  );
}

export default async function HrFormSubmissionsPage({ params }: PageProps) {
  await requirePermission("hr:forms:view");
  const { formId: formIdStr } = await params;
  const formId = parseInt(formIdStr, 10);
  return (
    <Suspense fallback={<FormSubmissionsLoading />}>
      <FormSubmissionsHydrated formId={formId} />
    </Suspense>
  );
}
