import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { OverdueView } from "@/features/timesheets/overdue";

export default async function TimesheetOverduePage() {
  await enforceRouteAccess("/timesheets/overdue");
  return <OverdueView />;
}
