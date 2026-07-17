import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SalaryStructuresPageContent } from "@/features/payroll/salary-structures/salary-structures-page";
import { SalaryStructuresSkeleton } from "./loading";

export const metadata = { title: "Salary Structure Templates — Payroll" };

export default async function PayrollSalaryStructuresPage() {
  await requirePermission("hr:salary:view");
  return (
    <Suspense fallback={<SalaryStructuresSkeleton />}>
      <SalaryStructuresPageContent />
    </Suspense>
  );
}
