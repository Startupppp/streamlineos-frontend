"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RecordList, asRecordValue, type RecordValue } from "@/components/renderer";
import { useDensity } from "@/components/renderer/density-toggle";
import { useDealLayout } from "@/features/crm/deals/use-deal-layout";
import { dealRecordFields } from "@/lib/renderer/crm/deal-layout";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import { useCan, useCanState } from "@/hooks/api/access";
import { useDealDetail } from "@/hooks/api/crm/deals";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMotionVariants } from "@/lib/motion-variants";
import type { Contact } from "@/types/crm";

/**
 * The four columns a deal is worth inside somebody else's record.
 *
 * The deals list shows eight, which is right on a page that is about deals. In a
 * panel on a contact the question is narrower — which deal, where is it, how big
 * and when does it land — and the rest is width spent on a question nobody asked
 * here. Narrowing rather than describing a second, smaller deal is the point:
 * these are `DEAL_LAYOUT`'s own columns, so a stage renamed by an administrator
 * is renamed here too.
 */
const RELATED_DEAL_COLUMNS = ["name", "stage", "value", "expectedCloseDate"] as const;

interface ContactRelatedDealsProps {
  contact: Contact;
}

/**
 * The deals this contact is attached to.
 *
 * This was a raw `<table>` with its own `<thead>`, its own row hover and its own
 * stage map — a second table beside the one the platform has, four columns wide,
 * showing a deal's stage in labels and colours the deals list did not share. It
 * now renders from `DEAL_LAYOUT` through `useDealLayout`, narrowed to four
 * columns, so a deal here reads as the same record it is on `/crm/deals` — the
 * same labels, the same alignment, and stage names that come from the tenant's
 * own pipeline rather than from a hardcoded map that went stale the moment an
 * administrator renamed a stage. The value renders in the organisation's own
 * currency instead of the INR-hardcoded `formatCurrency`.
 *
 * The panel self-gates on the deals read permission and renders nothing without
 * it. Falling through to "no related deals" would have told someone who cannot
 * see deals that this contact has none, which is a different statement and a
 * false one.
 */
export function ContactRelatedDeals({ contact }: ContactRelatedDealsProps) {
  const router = useRouter();
  // Narrowed after the tenant's arrangement, never before: a column somebody
  // hid on the deals list must not reappear through a panel.
  const layout = withColumns(useDealLayout(), RELATED_DEAL_COLUMNS);
  const money = useOrgDisplay();
  const [density] = useDensity();
  const { fadeUp } = useMotionVariants();
  const canReadDeals = useCan("crm:deals:read");

  const { data: deal, isLoading, isError, error, refetch } = useDealDetail(contact.dealId ?? 0);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRowClick = useCallback(
    (row: RecordValue) => router.push(`/crm/deals/${String(row.id)}`),
    [router],
  );

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:deals:read") === "denied")
    return <NoPermissionState permission="crm:deals:read" />;

  if (!canReadDeals) return null;

  const hasLinkedDeal = contact.dealId != null;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b px-4 py-3">
          <CardTitle className="text-sm font-medium">Related deals</CardTitle>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" asChild>
            <Link href="/crm/deals">
              <Plus className="h-3 w-3" />
              New deal
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!hasLinkedDeal ? (
            <EmptyState
              compact
              className="py-10"
              title="No related deals"
              description="Link this contact to a deal and it shows up here, with its stage, value and close date."
            />
          ) : isLoading ? (
            <DataTableSkeleton rows={2} columns={layout.list.columns.length} />
          ) : isError ? (
            <ErrorState
              compact
              title="Couldn't load this contact's deals"
              description={getErrorMessage(error)}
              onRetry={handleRetry}
            />
          ) : !deal ? (
            <EmptyState
              compact
              className="py-10"
              title="Deal unavailable"
              description="The deal linked to this contact could not be found. It may have been deleted."
            />
          ) : (
            <RecordList
              layout={layout}
              rows={[asRecordValue(dealRecordFields(deal))]}
              getRowKey={(row) => String(row.id)}
              onRowClick={handleRowClick}
              density={density}
              money={money}
              minWidth="640px"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
