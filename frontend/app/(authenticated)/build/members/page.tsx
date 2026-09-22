import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export const metadata = {
  title: "Members",
};

export default async function ProjectsMembersPage() {
  await enforceRouteAccess("/build/members");
  redirect("/build/settings/access");
}
