import { requirePermission } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { FnfPageContent } from "@/features/payroll/fnf";
import { FnfPageSkeleton } from "./loading";

export const metadata = { title: "Final settlement — Payroll" };

export default async function PayrollFnfPage() {
  await requirePermission("payroll:fnf:view");
  return (
    <Suspense fallback={<FnfPageSkeleton />}>
      <FnfPageContent />
    </Suspense>
  );
}
