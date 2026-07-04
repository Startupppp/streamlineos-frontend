import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ComponentsPageContent } from "@/features/payroll/components/components-page";
import { ComponentsPageSkeleton } from "./loading";

export const metadata = { title: "Component Catalog — Payroll" };

export default async function PayrollComponentsPage() {
  await requirePermission("payroll:components:view");
  return (
    <Suspense fallback={<ComponentsPageSkeleton />}>
      <ComponentsPageContent />
    </Suspense>
  );
}
