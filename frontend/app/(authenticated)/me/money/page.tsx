import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { MyExpensesPage } from "@/features/hr/expenses/my-expenses-page";
import { MyPayrollPageContent } from "@/features/payroll/me/me-page";
import { SelfServiceHub } from "@/features/me/hubs/self-service-hub";
import { MoneyHubTabs } from "@/features/payroll/me/money-hub-tabs";
import { SelfServiceHubSkeleton } from "@/features/me/hubs/self-service-hub-skeleton";
import { requireSession } from "@/lib/rbac/require-permission";
import { prefetchMeMoney } from "@/lib/prefetch/me";

export default async function MoneyPage() {
  await requireSession();
  const state = await prefetchMeMoney();
  const hubChrome = {
    title: "Expenses & Pay",
    subtitle: "Track claims, payslips and payroll details.",
    tabs: <MoneyHubTabs />,
  };
  return (
    <Suspense fallback={<SelfServiceHubSkeleton title={hubChrome.title} tabCount={4} />}>
      <HydrationBoundary state={state}>
        <SelfServiceHub
          hub="money"
          content={{
            expenses: <MyExpensesPage hubChrome={hubChrome} />,
            pay: <MyPayrollPageContent hubChrome={hubChrome} />,
          }}
        />
      </HydrationBoundary>
    </Suspense>
  );
}
