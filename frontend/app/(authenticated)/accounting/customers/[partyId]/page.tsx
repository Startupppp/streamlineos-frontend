import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CustomerDetailClient } from "@/features/accounting/parties";

export default async function AccountingCustomerDetailPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  await requirePermission("accounting:read");
  const { partyId } = await params;
  return (
    <Suspense>
      <CustomerDetailClient partyId={partyId} />
    </Suspense>
  );
}
