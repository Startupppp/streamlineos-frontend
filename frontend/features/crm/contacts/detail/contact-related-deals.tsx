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

const RELATED_DEAL_COLUMNS = ["name", "stage", "value", "expectedCloseDate"] as const;

interface ContactRelatedDealsProps {
  contact: Contact;
}

export function ContactRelatedDeals({ contact }: ContactRelatedDealsProps) {
  const router = useRouter();
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
