import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CreditNotesPageClient } from "@/features/accounting/sales";

export default async function AccountingCreditNotesPage() {
  await requirePermission("accounting:credit-notes:read");
  return (
    <Suspense>
      <CreditNotesPageClient />
    </Suspense>
  );
}
