import { requirePermission } from "@/lib/rbac/require-permission";
import { OfferTemplatesPage } from "@/features/recruitment/offer-templates/offer-templates-page";

export default async function RecruitmentOfferTemplatesRoute() {
  await requirePermission("hr:offers:view");
  return <OfferTemplatesPage />;
}
