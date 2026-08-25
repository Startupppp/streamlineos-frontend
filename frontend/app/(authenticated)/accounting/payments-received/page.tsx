import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ReceiptsPageClient } from "@/features/accounting/sales";

export default async function AccountingPaymentsReceivedPage() {
  await requirePermission("accounting:receivables:read");
  return (
    <Suspense>
      <ReceiptsPageClient />
    </Suspense>
  );
}
