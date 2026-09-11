import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ArDocumentComposer } from "@/features/accounting/sales";

export default async function NewAccountingCreditNotePage() {
  await requirePermission("accounting:credit-notes:create");
  return (
    <Suspense>
      <ArDocumentComposer kind="credit-note" />
    </Suspense>
  );
}
