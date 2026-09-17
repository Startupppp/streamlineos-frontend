import { requirePermission } from "@/lib/rbac/require-permission";
import { EmailSequencesPage } from "@/features/hr/recruitment/email-sequences/email-sequences-page";

export default async function RecruitmentEmailSequencesRoute() {
  await requirePermission("hr:employees:view");
  return <EmailSequencesPage />;
}
