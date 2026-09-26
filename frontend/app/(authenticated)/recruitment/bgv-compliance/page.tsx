import { requirePermission } from "@/lib/rbac/require-permission";
import { BgvCompliancePage } from "@/features/recruitment/bgv-compliance-page";

export default async function RecruitmentBgvComplianceRoute() {
  await requirePermission("hr:sensitive:view");
  return <BgvCompliancePage />;
}
