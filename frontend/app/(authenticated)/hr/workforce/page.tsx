import { DashboardGate } from "@/components/shared/dashboard-gate";
import { WorkforcePlanningPage } from "@/features/hr/workforce";

export default function HrWorkforcePage() {
  return (
    <DashboardGate permission="hr:analytics:read">
      <WorkforcePlanningPage />
    </DashboardGate>
  );
}
