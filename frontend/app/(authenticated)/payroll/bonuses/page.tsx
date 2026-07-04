import { requireSession } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { BonusesPageContent } from "@/features/payroll/bonuses";
import { BonusesPageSkeleton } from "./loading";

export const metadata = { title: "Bonuses & Incentives — Payroll" };

export default async function PayrollBonusesPage() {
  await requireSession();
  return (
    <Suspense fallback={<BonusesPageSkeleton />}>
      <BonusesPageContent />
    </Suspense>
  );
}
