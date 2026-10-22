import { requirePermission } from "@/lib/rbac/require-permission";
import { TravelApprovalsPage } from "@/features/hr/travel/travel-approvals-page";

export default async function HrTravelApprovalsPage() {
  await requirePermission("hr:travel:manage");
  return <TravelApprovalsPage />;
}
