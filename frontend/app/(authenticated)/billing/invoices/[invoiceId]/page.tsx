import { notFound } from "next/navigation";
import { InvoiceDetail } from "@/features/billing/invoice-detail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const id = Number(invoiceId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <InvoiceDetail invoiceId={id} />;
}
