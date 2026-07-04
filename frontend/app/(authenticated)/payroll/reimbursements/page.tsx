import { requireSession } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { ReimbursementsPageContent } from "@/features/payroll/reimbursements";
import { ReimbursementsPageSkeleton } from "./loading";

export const metadata = { title: "Reimbursements — Payroll" };

export default async function PayrollReimbursementsPage() {
  await requireSession();
  return (
    <Suspense fallback={<ReimbursementsPageSkeleton />}>
      <ReimbursementsPageContent />
    </Suspense>
  );
}
