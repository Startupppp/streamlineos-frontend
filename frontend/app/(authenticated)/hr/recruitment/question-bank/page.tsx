import { requirePermission } from "@/lib/rbac/require-permission";
import { QuestionBankPage } from "@/features/recruitment/question-bank-page";

export default async function RecruitmentQuestionBankRoute() {
  await requirePermission("hr:interviews:view");
  return <QuestionBankPage />;
}
