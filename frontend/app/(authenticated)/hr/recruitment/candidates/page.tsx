import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CandidatesPage } from "@/features/hr/recruitment/candidates/candidates-page";
import CandidatesLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:requisitions:view");
  return (
    <Suspense fallback={<CandidatesLoading />}>
      <CandidatesPage />
    </Suspense>
  );
}
