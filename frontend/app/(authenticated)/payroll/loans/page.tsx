import { requireSession } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { LoansPageContent } from "@/features/payroll/loans";
import { LoansPageSkeleton } from "./loading";

export const metadata = { title: "Loans & Advances — Payroll" };

export default async function PayrollLoansPage() {
  await requireSession();
  return (
    <Suspense fallback={<LoansPageSkeleton />}>
      <LoansPageContent />
    </Suspense>
  );
}
