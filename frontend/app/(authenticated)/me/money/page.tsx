import { Suspense } from "react";
import { MyExpensesPage } from "@/features/hr/expenses/my-expenses-page";
import { MyPayrollPageContent } from "@/features/payroll/me/me-page";
import { SelfServiceHub } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MoneyPage() {
  await requireSession();
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title="Money" />}>
      <SelfServiceHub
        hub="money"
        content={{ expenses: <MyExpensesPage />, pay: <MyPayrollPageContent /> }}
      />
    </Suspense>
  );
}
