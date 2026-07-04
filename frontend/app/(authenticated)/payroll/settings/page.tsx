import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { SettingsPageContent } from "@/features/payroll/settings/settings-page";
import { SettingsPageSkeleton } from "./loading";

export const metadata = { title: "Payroll Settings" };

export default async function PayrollSettingsPage() {
  await requirePermission("payroll:settings:manage");
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  );
}
