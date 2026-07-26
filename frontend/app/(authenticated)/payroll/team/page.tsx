import { requireSession } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { TeamPayrollPageContent } from "@/features/payroll/team";
import { TeamPayrollSkeleton } from "./loading";

export const metadata = { title: "Team Payroll — Payroll" };

export default async function TeamPayrollPage() {
  await requireSession();
  return (
    <Suspense fallback={<TeamPayrollSkeleton />}>
      <TeamPayrollPageContent />
    </Suspense>
  );
}
