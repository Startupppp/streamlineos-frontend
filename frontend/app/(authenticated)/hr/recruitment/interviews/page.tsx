import { requirePermission } from "@/lib/rbac/require-permission";
import { InterviewsPage } from "@/features/hr/recruitment/interviews-page";

export default async function Page() {
  await requirePermission("hr:interviews:view");
  return <InterviewsPage />;
}
