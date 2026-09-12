import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ArDocumentComposer } from "@/features/accounting/sales";

export default async function NewAccountingInvoicePage() {
  await requirePermission("accounting:receivables:manage");
  return (
    <Suspense>
      <ArDocumentComposer kind="invoice" />
    </Suspense>
  );
}
