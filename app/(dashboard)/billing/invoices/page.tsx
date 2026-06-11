import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { getInvoices, getInvoiceStats } from "@/server/queries/invoice";
import { getServerQueryClient } from "@/lib/api/server-query-client";
import { queryKeys } from "@/lib/query-keys";
import type { InvoiceStatus } from "@/types/invoice";
import { InvoicesClient } from "./invoices-client";

const VALID_STATUSES = new Set<InvoiceStatus>([
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const auth = await getAuthenticatedMember();

  if ("error" in auth) {
    return (
      <DashboardGate allowedRoles={["CEO", "HR"]}>
        <InvoicesClient />
      </DashboardGate>
    );
  }

  const statusFilter =
    status && VALID_STATUSES.has(status as InvoiceStatus)
      ? (status as InvoiceStatus)
      : undefined;
  const listFilter = statusFilter ? { status: statusFilter } : undefined;

  const qc = getServerQueryClient();
  await Promise.all([
    qc.prefetchQuery({
      queryKey: queryKeys.invoice.list(listFilter as Record<string, unknown>),
      queryFn: () => getInvoices(auth.orgId, listFilter),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.invoice.stats(),
      queryFn: () => getInvoiceStats(auth.orgId),
    }),
  ]);

  return (
    <DashboardGate allowedRoles={["CEO", "HR"]}>
      <HydrationBoundary state={dehydrate(qc)}>
        <InvoicesClient />
      </HydrationBoundary>
    </DashboardGate>
  );
}
