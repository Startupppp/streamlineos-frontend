import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IntakePage } from "@/features/build/intake/intake-page";

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

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
  const rawHighlight =
    firstString(sp.highlight) ?? firstString(sp.item) ?? undefined;
  const highlightRequested =
    rawHighlight !== undefined && rawHighlight.length > 0;
  const highlightId =
    highlightRequested && rawHighlight !== undefined && /^\d+$/.test(rawHighlight)
      ? Number(rawHighlight)
      : undefined;
  return (
    <IntakePage
      projectId={Number(projectId)}
      highlightId={highlightId}
      highlightRequested={highlightRequested}
    />
  );
}
