import { requirePermission } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { TaxesPageContent } from "@/features/payroll/taxes";
import { TaxesPageSkeleton } from "./loading";

export const metadata = { title: "Tax & Statutory — Payroll" };

export default async function PayrollTaxesPage() {
  await requirePermission("payroll:tax:view");
  return (
    <Suspense fallback={<TaxesPageSkeleton />}>
      <TaxesPageContent />
    </Suspense>
  );
}
