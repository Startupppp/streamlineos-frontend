import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { FormDetailPage } from "@/features/build/forms/form-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; formId: string }>;
}

export default async function FormDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/forms/[formId]");
  const { projectId, formId } = await params;
  return (
    <FormDetailPage
      projectId={parseInt(projectId, 10)}
      formId={parseInt(formId, 10)}
    />
  );
}
