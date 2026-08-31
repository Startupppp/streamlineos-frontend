import { requirePermission } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { PayrollImportExportContent } from "@/features/payroll/settings/import-export-page";
import PayrollImportExportLoading from "./loading";

export const metadata = { title: "Import / Export — Payroll" };

export default async function PayrollImportExportPage() {
  await requirePermission("payroll:reports:view");
  return (
    <Suspense fallback={<PayrollImportExportLoading />}>
      <PayrollImportExportContent />
    </Suspense>
  );
}
