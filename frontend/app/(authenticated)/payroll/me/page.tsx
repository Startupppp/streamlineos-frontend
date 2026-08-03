import { requireSession } from "@/lib/rbac/require-permission";
import { Suspense } from "react";
import { MyPayrollPageContent } from "@/features/payroll/me";
import MyPayrollLoading from "./loading";

export const metadata = { title: "My Payroll" };

export default async function MyPayrollPage() {
  await requireSession();
  return (
    <Suspense fallback={<MyPayrollLoading />}>
      <MyPayrollPageContent />
    </Suspense>
  );
}
