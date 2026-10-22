import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { DashboardClient } from "@/features/dashboard/dashboard-client";
import { prefetchDashboard } from "@/lib/prefetch/dashboard";
import { ExpensesWidget } from "@/features/hr/expenses/expenses-widget";
import { PublicDocumentsCard } from "@/features/hr/document-review/public-documents-card";
import DashboardLoading from "./loading";

async function DashboardHydrated() {
  const state = await prefetchDashboard();
  return (
    <HydrationBoundary state={state}>
      <DashboardClient
        expensesSlot={<ExpensesWidget />}
        publicDocumentsSlot={<PublicDocumentsCard />}
      />
    </HydrationBoundary>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardHydrated />
    </Suspense>
  );
}
