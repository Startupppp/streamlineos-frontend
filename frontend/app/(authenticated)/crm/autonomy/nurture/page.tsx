import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { NurtureSequencesPage } from "@/features/crm/nurture/nurture-sequences-page";

export default async function NurtureSequencesRoute() {
  await requirePermission("crm:autonomy:view");

  return (
    <Suspense>
      <NurtureSequencesPage />
    </Suspense>
  );
}
