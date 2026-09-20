import { requirePermission } from "@/lib/rbac/require-permission";
import { CandidatesPage } from "@/features/hr/recruitment/candidates/candidates-page";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return <CandidatesPage />;
}
