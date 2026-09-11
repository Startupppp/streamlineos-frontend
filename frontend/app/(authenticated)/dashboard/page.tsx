import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { DashboardClient } from "@/features/dashboard/dashboard-client";
import { prefetchDashboardStats } from "@/lib/prefetch/dashboard";
import { ExpensesWidget } from "@/features/hr/expenses/expenses-widget";
import { PublicDocumentsCard } from "@/features/hr/document-review/public-documents-card";

async function DashboardHydrated() {
  const state = await prefetchDashboardStats();
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
    <Suspense>
      <DashboardHydrated />
    </Suspense>
  );
}
