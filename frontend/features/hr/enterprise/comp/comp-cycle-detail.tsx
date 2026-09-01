"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  useCompCycle,
  useCompRecommendations,
  useBudgetPools,
  useCalibrateRecommendation,
  type CompRecommendation,
} from "@/hooks/api/hr/enterprise-comp";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";

interface Props {
  cycleId: number;
  canManage: boolean;
}

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function BudgetBar({ allocated, used }: { allocated: number; used: number }) {
  const pct = allocated > 0 ? Math.min((used / allocated) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCents(used)} used</span>
        <span>{formatCents(allocated)} budget</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% utilized</p>
    </div>
  );
}

export function CompCycleDetail({ cycleId, canManage }: Props) {
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const { data: cycle, isLoading: cycleLoading } = useCompCycle(cycleId);
  const {
    data: recsData,
    isLoading: recsLoading,
    isFetching: recsFetching,
  } = useCompRecommendations(cycleId, { cursor });
  const { data: pools, isLoading: poolsLoading } = useBudgetPools(cycleId);
  const calibrateMut = useCalibrateRecommendation();
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, {
        name: member.name,
        email: member.email,
      });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = (userId: string) => {
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  };

  const [calibratingId, setCalibratingId] = useState<number | null>(null);
  const [calibrateValue, setCalibrateValue] = useState<Record<number, string>>({});

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = recsData?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [recsData?.pagination.nextCursor]);

  if (cycleLoading) return <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;

  const recs = recsData?.data ?? [];

  function handleCalibrate(rec: CompRecommendation) {
    const val = calibrateValue[rec.id];
    if (!val) return;
    setCalibratingId(rec.id);
    calibrateMut.mutate(
      { id: rec.id, hrCalibratedCents: parseInt(val) },
      {
        onSuccess: () => { toast.success("Calibrated"); setCalibratingId(null); },
        onError: (err) => { toast.error(getErrorMessage(err)); setCalibratingId(null); },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Pools */}
      {!poolsLoading && pools && pools.length > 0 && (
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <p className="text-sm font-semibold">Budget Pools</p>
          {pools.map((pool) => (
            <BudgetBar key={pool.id} allocated={pool.allocatedCents} used={pool.usedCents} />
          ))}
        </div>
      )}

      {/* Merit Matrix */}
      {cycle?.meritMatrix && Object.keys(cycle.meritMatrix).length > 0 && (
        <div className="p-4 rounded-xl border bg-card">
          <p className="text-sm font-semibold mb-3">Merit Matrix</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(cycle.meritMatrix).map(([rating, pct]) => (
              <div key={rating} className="p-2 rounded-lg bg-primary/5 text-center">
                <p className="text-xs text-muted-foreground">{rating}</p>
                <p className="text-sm font-bold text-primary">{pct}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <p className="text-sm font-semibold mb-3">Recommendations ({recs.length})</p>
        {recsLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 mb-2 rounded-lg" />)
        ) : !recs.length ? (
          <EmptyState illustrationPreset="default" title="No recommendations yet" compact className="h-40 border-0 shadow-none" />
        ) : (
          <div className="flex min-h-0 flex-col gap-3">
            <DataTable
              getRowKey={(r) => r.id}
              columns={[
              { key: "user", header: "Employee", cell: (r) => <span className="font-medium text-sm">{resolveMemberName(r.userId)}</span> },
              { key: "current", header: "Current Salary", cell: (r) => formatCents(r.currentSalaryCents) },
              { key: "increase", header: "Increase", cell: (r) => <span className="text-primary font-medium">{formatCents(r.recommendedIncreaseCents)}</span> },
              { key: "calibrated", header: "Calibrated", cell: (r) => formatCents(r.hrCalibratedCents) },
              {
                key: "status",
                header: "Status",
                cell: (r) => <Badge variant="secondary" className="capitalize text-dense">{r.status}</Badge>,
              },
              {
                key: "calibrateAction",
                header: "",
                cell: (r) => canManage && r.status === "submitted" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-28 text-xs"
                      placeholder="Calibrated $"
                      value={calibrateValue[r.id] ?? ""}
                      onChange={(e) => setCalibrateValue((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <LoadingButton
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      isPending={calibratingId === r.id}
                      onClick={() => handleCalibrate(r)}
                    >
                      Set
                    </LoadingButton>
                  </div>
                ) : null,
              },
              ]}
              data={recs}
            />
            {recsData && (page > 1 || recsData.pagination.hasMore) ? (
              <CursorPageControls
                page={page}
                hasNext={recsData.pagination.hasMore}
                disabled={recsFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
