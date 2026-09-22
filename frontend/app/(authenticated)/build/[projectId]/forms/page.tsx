import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { FormsListPage } from "@/features/build/forms/forms-list-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectFormsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/forms");
  const { projectId } = await params;
  return <FormsListPage projectId={parseInt(projectId, 10)} />;
}
