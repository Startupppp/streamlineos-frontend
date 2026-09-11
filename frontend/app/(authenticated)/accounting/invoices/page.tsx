import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { InvoicesPageClient } from "@/features/accounting/sales";

export default async function AccountingInvoicesPage() {
  await requirePermission("accounting:receivables:read");
  return (
    <Suspense>
      <InvoicesPageClient />
    </Suspense>
  );
}
