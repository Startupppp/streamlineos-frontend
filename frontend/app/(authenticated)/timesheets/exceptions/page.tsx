import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ExceptionsView } from "@/features/timesheets/exceptions";

export default async function TimesheetExceptionsPage() {
  await enforceRouteAccess("/timesheets/exceptions");
  return <ExceptionsView />;
}
