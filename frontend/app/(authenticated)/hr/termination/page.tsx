import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { TerminationPage } from "@/features/hr/termination/termination-page";

export default async function Page() {
  await requirePermission("hr:exit:manage");
  return (
    <Suspense>
      <TerminationPage />
    </Suspense>
  );
}
