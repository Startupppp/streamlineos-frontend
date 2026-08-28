import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { InvoiceDetail } from "@/features/billing/invoice-detail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await enforceRouteAccess("/billing/invoices/[invoiceId]");
  const { invoiceId } = await params;
  const id = Number(invoiceId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <InvoiceDetail invoiceId={id} />;
}
