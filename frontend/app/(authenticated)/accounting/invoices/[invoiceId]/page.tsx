import { requirePermission } from "@/lib/rbac/require-permission";
import { InvoiceDetailClient } from "@/features/accounting/sales";

export default async function AccountingInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await requirePermission("accounting:receivables:read");
  const { invoiceId } = await params;
  return <InvoiceDetailClient invoiceId={invoiceId} />;
}
