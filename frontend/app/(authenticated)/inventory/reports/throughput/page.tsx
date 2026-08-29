import { Suspense } from "react";
import { ThroughputDashboardPage } from "@/features/inventory/components/reports/throughput-dashboard-page";

export default function ThroughputRoute() {
  return (
    <Suspense fallback={null}>
      <ThroughputDashboardPage />
    </Suspense>
  );
}
