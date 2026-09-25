import { requirePermission } from "@/lib/rbac/require-permission";
import { RecruitmentInboxPage } from "@/features/recruitment/inbox/recruitment-inbox-page";

export default async function RecruitmentInboxRoute() {
  await requirePermission("hr:requisitions:view");
  return <RecruitmentInboxPage />;
}
