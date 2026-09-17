import { requirePermission } from "@/lib/rbac/require-permission";
import { RecruitmentInboxPage } from "@/features/hr/recruitment/inbox/recruitment-inbox-page";

export default async function RecruitmentInboxRoute() {
  await requirePermission("hr:employees:view");
  return <RecruitmentInboxPage />;
}
