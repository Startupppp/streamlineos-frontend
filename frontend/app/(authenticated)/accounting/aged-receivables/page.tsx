import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AgedReceivablesClient } from "@/features/accounting/sales";

export default async function AccountingAgedReceivablesPage() {
  await requirePermission("accounting:receivables:read");
  return (
    <Suspense>
      <AgedReceivablesClient />
    </Suspense>
  );
}
