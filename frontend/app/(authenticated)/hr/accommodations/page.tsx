import { requirePermission } from "@/lib/rbac/require-permission";
import { AccommodationsPageContent } from "@/features/hr/enterprise/ops/accommodations/accommodations-page-content";

export default async function HrAccommodationsPage() {
  await requirePermission("hr:accommodations:view");
  return <AccommodationsPageContent />;
}
