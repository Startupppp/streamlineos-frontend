import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ProjectsPage } from "@/features/build/project-list/projects-page";

interface Props {
  params: Promise<{ managedProductId: string }>;
}

export default async function ManagedProductProjectsRoute({ params }: Props) {
  await enforceRouteAccess("/build/managed-products/[managedProductId]/projects");
  const { managedProductId } = await params;
  const parsed = Number(managedProductId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ProjectsPage managedProductId={parsed} />;
}
