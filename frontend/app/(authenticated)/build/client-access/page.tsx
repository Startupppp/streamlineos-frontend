import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function BuildClientAccessRoute() {
  await enforceRouteAccess("/build/client-access");
  redirect("/build/settings/client-access");
}
