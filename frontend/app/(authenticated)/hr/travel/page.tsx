import { requirePermission } from "@/lib/rbac/require-permission";
import { TravelPage } from "@/features/hr/travel/travel-page";

export default async function HrTravelPage() {
  await requirePermission("hr:travel:view");
  return <TravelPage />;
}
