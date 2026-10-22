import { Suspense } from "react";
import { MyExpensesPage } from "@/features/hr/expenses/my-expenses-page";
import { MyPayrollPageContent } from "@/features/payroll/me/me-page";
import { SelfServiceHub, SelfServiceHubTabs } from "@/features/me/hubs/self-service-hub";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MoneyPage() {
  await requireSession();
  const hubChrome = {
    title: "Expenses & Pay",
    subtitle: "Track claims, payslips and payroll details.",
    tabs: <SelfServiceHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} />}>
      <SelfServiceHub
        hub="money"
        content={{
          expenses: <MyExpensesPage hubChrome={hubChrome} />,
          pay: <MyPayrollPageContent hubChrome={hubChrome} />,
        }}
      />
    </Suspense>
  );
}
