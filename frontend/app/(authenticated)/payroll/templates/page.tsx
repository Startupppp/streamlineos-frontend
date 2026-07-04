import { requirePermission } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { TemplatesPageContent } from "@/features/payroll/templates/templates-page";
import { TemplatesPageSkeleton } from "./loading";

export const metadata = { title: "Template Library — Payroll" };

export default async function PayrollTemplatesPage() {
  await requirePermission("payroll:templates:view");
  return (
    <Suspense fallback={<TemplatesPageSkeleton />}>
      <TemplatesPageContent />
    </Suspense>
  );
}
