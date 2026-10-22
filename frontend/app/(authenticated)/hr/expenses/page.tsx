import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ExpensesPage } from "@/features/hr/expenses/expenses-page";
import { prefetchHrExpenses } from "@/lib/prefetch/hr";
import ExpensesLoading from "./loading";

export default async function Page() {
  await requirePermission("hr:expenses:view");
  const state = await prefetchHrExpenses();
  return (
    <Suspense fallback={<ExpensesLoading />}>
      <HydrationBoundary state={state}>
        <ExpensesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
