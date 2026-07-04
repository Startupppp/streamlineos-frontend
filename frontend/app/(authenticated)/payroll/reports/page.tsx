import { Suspense } from "react";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ReportsPageContent } from "@/features/payroll/reports";
import { ReportsPageSkeleton } from "./loading";

export const metadata: Metadata = { title: "Payroll Reports" };

export default async function PayrollReportsPage() {
  await requirePermission("payroll:reports:view");
  return (
    <Suspense fallback={<ReportsPageSkeleton />}>
      <ReportsPageContent />
    </Suspense>
  );
}
