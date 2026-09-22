import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function BuildAccessRoute() {
  await enforceRouteAccess("/build/access");
  redirect("/build/settings/access");
}
