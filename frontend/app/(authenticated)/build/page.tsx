import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { resolveBuildEntryDestination } from "@/lib/build/build-entry-destination";

export default async function BuildRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await enforceRouteAccess("/build");
  redirect(resolveBuildEntryDestination(await searchParams));
}
