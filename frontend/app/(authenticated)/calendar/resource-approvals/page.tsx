import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function CalendarResourceApprovalsPage() {
  await enforceRouteAccess("/calendar/resource-approvals");
  redirect("/calendar?section=approvals");
}
