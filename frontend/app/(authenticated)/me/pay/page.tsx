import { Suspense } from "react";
import { MyPayrollPageContent } from "@/features/payroll/me";
import { requirePermission } from "@/lib/rbac/require-permission";
import { Skeleton } from "@/components/ui/skeleton";

function PayLoading() {
  return <Skeleton className="m-4 h-64 rounded-lg" />;
}

export default async function MyPayPage() {
  await requirePermission(["self:payroll", "self:payslips"]);
  return (
    <Suspense fallback={<PayLoading />}>
      <MyPayrollPageContent />
    </Suspense>
  );
}
