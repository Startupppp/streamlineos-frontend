import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { InvoicesClient } from "@/features/billing/invoices-client";

export default async function InvoicesPage() {
  await enforceRouteAccess("/billing/invoices");
  return (
    <DashboardGate permission="accounting:view">
      <InvoicesClient />
    </DashboardGate>
  );
}
