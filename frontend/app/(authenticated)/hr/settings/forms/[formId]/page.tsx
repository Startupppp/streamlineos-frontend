import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { HrFormBuilderContent } from "@/features/hr/forms/components/hr-form-builder-content";
import { prefetchHrFormDetail } from "@/lib/prefetch/hr-time";
import FormBuilderLoading from "./loading";

interface PageProps {
  params: Promise<{ formId: string }>;
}

async function FormBuilderHydrated({ formId }: { formId: number }) {
  const state = await prefetchHrFormDetail(formId);
  return (
    <HydrationBoundary state={state}>
      <HrFormBuilderContent formId={formId} />
    </HydrationBoundary>
  );
}

export default async function HrFormBuilderPage({ params }: PageProps) {
  await requirePermission("hr:forms:view");
  const { formId: formIdStr } = await params;
  const formId = parseInt(formIdStr, 10);
  return (
    <Suspense fallback={<FormBuilderLoading />}>
      <FormBuilderHydrated formId={formId} />
    </Suspense>
  );
}
