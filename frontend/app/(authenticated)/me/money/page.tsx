import { Suspense } from "react";
import { MyExpensesPage } from "@/features/hr/expenses/my-expenses-page";
import { MyPayrollPageContent } from "@/features/payroll/me/me-page";
import { SelfServiceHub, SelfServiceSectionSelector } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MoneyPage() {
  await requireSession();
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title="Expenses" />}>
      <SelfServiceHub
        hub="money"
        content={{
          expenses: <MyExpensesPage sectionSelector={<SelfServiceSectionSelector />} />,
          pay: <MyPayrollPageContent sectionSelector={<SelfServiceSectionSelector />} />,
        }}
      />
    </Suspense>
  );
}
