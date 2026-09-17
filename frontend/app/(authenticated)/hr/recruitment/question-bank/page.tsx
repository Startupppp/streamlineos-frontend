import { requirePermission } from "@/lib/rbac/require-permission";
import { QuestionBankPage } from "@/features/hr/recruitment/question-bank-page";

export default async function RecruitmentQuestionBankRoute() {
  await requirePermission("hr:employees:view");
  return <QuestionBankPage />;
}
