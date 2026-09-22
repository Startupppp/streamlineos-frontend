import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function ProjectDraftsPage() {
  await enforceRouteAccess("/build/drafts");
  redirect("/build/inbox?view=drafts");
}
