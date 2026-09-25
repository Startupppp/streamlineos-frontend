"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { EquityGrantSheet } from "@/features/hr/enterprise/comp/equity-grant-sheet";
import { VestingTimeline } from "@/features/hr/enterprise/comp/vesting-timeline";
import { ExerciseDialog } from "@/features/hr/enterprise/comp/exercise-dialog";
import { useEquityGrants, type EquityGrant } from "@/hooks/api/hr/enterprise-comp";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney } from "@/lib/format-utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  exercised: "outline",
  cancelled: "destructive",
  expired: "secondary",
};

export function EquityPage() {
  const canManage = useCan("hr:equity:manage");
  const money = useOrgDisplay();
  const [grantSheetOpen, setGrantSheetOpen] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<EquityGrant | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);

  const { data, isLoading, isFetching, isError, error, refetch } = useEquityGrants({ cursor, limit: 20 });
  const { data: membersData } = useOrgMembers(1, 200);
  const grants = data?.data ?? [];
  const pageState = usePageState({ permission: "hr:equity:view", module: "hr", isLoading, isError, error });
  function handleRetry() { void refetch(); }

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : "Unknown member";
    },
    [memberById],
  );

  const grantColumns = useMemo(() => [
    { key: "employee", header: "Employee", cell: (r: EquityGrant) => <span className="font-medium text-sm">{resolveMemberName(r.userId)}</span> },
    { key: "type", header: "Type", cell: (r: EquityGrant) => <Badge variant="secondary">{r.grantType}</Badge> },
    { key: "units", header: "Units", cell: (r: EquityGrant) => <span className="tabular-nums">{r.units.toLocaleString()}</span> },
    { key: "date", header: "Grant Date", cell: (r: EquityGrant) => format(new Date(r.grantDate), "dd MMM yyyy") },
    { key: "cliff", header: "Cliff", cell: (r: EquityGrant) => `${r.cliffMonths}m` },
    { key: "vesting", header: "Vesting", cell: (r: EquityGrant) => `${r.vestingMonths}m` },
    {
      key: "status",
      header: "Status",
      cell: (r: EquityGrant) => <Badge variant={STATUS_VARIANT[r.status]} className="capitalize text-dense">{r.status}</Badge>,
    },
    {
      key: "board",
      header: "Board Approved",
      cell: (r: EquityGrant) => r.boardApprovedAt ? (
        <span className="inline-flex items-center gap-1 text-xs text-status-success-ink"><Check className="h-3 w-3" aria-hidden />{format(new Date(r.boardApprovedAt), "dd MMM yyyy")}</span>
      ) : (
        <span className="text-xs text-muted-foreground">Pending</span>
      ),
    },
  ], [resolveMemberName]);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  return (
    <PageWrapper
      title="Equity & ESOP"
      subtitle="Manage equity grants, vesting schedules, and exercises"
      actions={
        canManage ? (
          <Button onClick={() => setGrantSheetOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Grant
          </Button>
        ) : undefined
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className={selectedGrant ? "lg:col-span-3" : "lg:col-span-5"}>
            <PageState
              resolution={pageState}
              loading={<div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>}
              onRetry={handleRetry}
              className="flex-1"
            >
            {!grants.length ? (
              <EmptyState
                illustrationPreset="default"
                title="No equity grants"
                description="Create ESOP, ISO, NSO, or RSU grants for employees"
                action={canManage ? { label: "New Grant", onClick: () => setGrantSheetOpen(true) } : undefined}
                className="h-64"
                compact
              />
            ) : (
              <DataTable
                getRowKey={(r) => r.id}
                onRowClick={setSelectedGrant}
                data={grants}
                columns={grantColumns}
              />
            )}
            </PageState>
            {data && (page > 1 || data.pagination.hasMore) ? (
              <CursorPageControls
                page={page}
                hasNext={data.pagination.hasMore}
                disabled={isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
                className="mt-3"
              />
            ) : null}
          </div>

          {selectedGrant && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">Grant #{selectedGrant.id}</p>
                  <Button variant="ghost" size="icon" aria-label="Close grant details" onClick={() => setSelectedGrant(null)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{selectedGrant.grantType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Units</span><span className="font-medium">{selectedGrant.units.toLocaleString()}</span></div>
                  {selectedGrant.strikePriceCents && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Strike Price</span><span className="font-medium tabular-nums">{formatMoney(selectedGrant.strikePriceCents / 100, money)}</span></div>
                  )}
                </div>

                {canManage && selectedGrant.status === "active" && (
                  <Button onClick={() => setExerciseOpen(true)} variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/5">
                    Record Exercise
                  </Button>
                )}
              </div>

              <div className="p-4 rounded-xl border bg-card">
                <p className="font-semibold text-sm mb-3">Vesting Schedule</p>
                <VestingTimeline grantId={selectedGrant.id} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <EquityGrantSheet open={grantSheetOpen} onOpenChange={setGrantSheetOpen} />
      {selectedGrant && (
        <ExerciseDialog open={exerciseOpen} onOpenChange={setExerciseOpen} grantId={selectedGrant.id} />
      )}
    </PageWrapper>
  );
}
