import { requirePermission } from "@/lib/rbac/require-permission";
import { EmailSequencesPage } from "@/features/recruitment/email-sequences/email-sequences-page";

export default async function RecruitmentEmailSequencesRoute() {
  await requirePermission("hr:requisitions:view");
  return <EmailSequencesPage />;
}
