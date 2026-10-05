import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IntakePage } from "@/features/build/intake/intake-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await enforceRouteAccess("/build/[projectId]/intake");
  const { projectId } = await params;
  const sp = await searchParams;
  const itemParam = typeof sp.item === "string" ? sp.item : undefined;
  const highlightId = itemParam !== undefined && /^\d+$/.test(itemParam) ? Number(itemParam) : undefined;
  return <IntakePage projectId={Number(projectId)} highlightId={highlightId} />;
}
