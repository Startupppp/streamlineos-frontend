import { requirePermission } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { LoansPageContent } from "@/features/payroll/loans";
import { LoansPageSkeleton } from "./loading";

export const metadata = { title: "Loans & Advances — Payroll" };

export default async function PayrollLoansPage() {
  await requirePermission("payroll:runs:view");
  return (
    <Suspense fallback={<LoansPageSkeleton />}>
      <LoansPageContent />
    </Suspense>
  );
}
