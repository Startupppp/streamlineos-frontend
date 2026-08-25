import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CustomersPageClient } from "@/features/accounting/parties";

export default async function AccountingCustomersPage() {
  await requirePermission("accounting:read");
  return (
    <Suspense>
      <CustomersPageClient />
    </Suspense>
  );
}
