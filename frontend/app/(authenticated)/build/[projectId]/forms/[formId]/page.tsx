import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { FormDetailPage } from "@/features/build/forms/form-detail-page";
import { prefetchFormDetail } from "@/lib/prefetch/build-project-extras";
import FormDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string; formId: string }>;
}

async function FormDetailHydrated({ projectId, formId }: { projectId: number; formId: number }) {
  const state = await prefetchFormDetail(projectId, formId);
  return (
    <HydrationBoundary state={state}>
      <FormDetailPage projectId={projectId} formId={formId} />
    </HydrationBoundary>
  );
}

export default async function FormDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/forms/[formId]");
  const { projectId, formId } = await params;
  return (
    <Suspense fallback={<FormDetailLoading />}>
      <FormDetailHydrated projectId={parseInt(projectId, 10)} formId={parseInt(formId, 10)} />
    </Suspense>
  );
}
