import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function MyWorkRoute({ params }: Props) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/my-work");
  const { pmWorkspaceId } = await params;
  redirect(`/build/my-work?pmWorkspaceId=${encodeURIComponent(pmWorkspaceId)}`);
}
