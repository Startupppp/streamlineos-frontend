import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import {
  listLedgerAccounts,
  listJournalEntries,
  getTrialBalanceSnapshot,
} from "@/server/queries/accounting";
import { getServerQueryClient } from "@/lib/api/server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { AccountingHubClient } from "./accounting-hub-client";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AccountingHubPage() {
  const auth = await getAuthenticatedMember();
  if ("error" in auth) {
    return <AccountingHubClient />;
  }

  const asOf = todayIso();
  const qc = getServerQueryClient();

  await Promise.all([
    qc.prefetchQuery({
      queryKey: queryKeys.accounting.accounts({ page: 1, pageSize: 1 }),
      queryFn: () => listLedgerAccounts(auth.orgId, { page: 1, pageSize: 1 }),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.accounting.journal({ page: 1, pageSize: 1 }),
      queryFn: () => listJournalEntries(auth.orgId, { page: 1, pageSize: 1 }),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.accounting.trialBalance(asOf),
      queryFn: () => getTrialBalanceSnapshot(auth.orgId, asOf),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <AccountingHubClient />
    </HydrationBoundary>
  );
}
