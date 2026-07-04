import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SetupWizard } from "@/features/payroll/setup";
import { SetupPageSkeleton } from "./loading";

export const metadata = { title: "Payroll Setup" };

export default async function PayrollSetupPage() {
  await requirePermission("payroll:policies:manage");
  return (
    <Suspense fallback={<SetupPageSkeleton />}>
      <SetupWizard />
    </Suspense>
  );
}
