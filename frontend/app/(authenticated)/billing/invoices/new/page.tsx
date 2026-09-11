import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { NewInvoicePageClient } from "@/features/billing/new-invoice/new-invoice-page-client";

export default async function NewInvoicePage() {
  await enforceRouteAccess("/billing/invoices/new");
  return <NewInvoicePageClient />;
}
