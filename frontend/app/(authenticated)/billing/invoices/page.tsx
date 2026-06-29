import { DashboardGate } from "@/components/shared/dashboard-gate";
import { InvoicesClient } from "./invoices-client";

export default function InvoicesPage() {
  return (
    <DashboardGate permission="accounting:view">
      <InvoicesClient />
    </DashboardGate>
  );
}
