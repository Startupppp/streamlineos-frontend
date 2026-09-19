import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ManagedProductsPage } from "@/features/build/managed-products/managed-products-page";

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function PmWorkspaceProductsRoute({ params }: Props) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/products");
  const { pmWorkspaceId } = await params;
  return <ManagedProductsPage pmWorkspaceId={pmWorkspaceId} />;
}
