import { redirect } from "next/navigation";
import { z } from "zod";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

const positiveInt = z.coerce.number().int().positive();

export default async function AgileReportsRedirectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/agile-reports");
  const { projectId } = await params;
  const parsed = positiveInt.safeParse(projectId);
  redirect(parsed.success ? `/build/${parsed.data}/reports` : "/build");
}
