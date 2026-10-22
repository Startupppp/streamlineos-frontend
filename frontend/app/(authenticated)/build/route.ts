import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { resolveBuildEntryDestination } from "@/lib/build/build-entry-destination";

function searchParamsOf(url: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  new URL(url).searchParams.forEach((value, key) => {
    const previous = params[key];
    if (previous === undefined) params[key] = value;
    else if (Array.isArray(previous)) previous.push(value);
    else params[key] = [previous, value];
  });
  return params;
}

export async function GET(request: Request) {
  await enforceRouteAccess("/build");
  redirect(resolveBuildEntryDestination(searchParamsOf(request.url)));
}
