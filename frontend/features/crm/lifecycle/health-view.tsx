"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Activity, AlertTriangle, HeartPulse, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan, useCanState } from "@/hooks/api/access";
import {
  useCustomerHealthRoster,
  useRecomputeCustomerHealth,
} from "@/hooks/api/crm/lifecycle";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CustomerHealthBand } from "@/types/crm/lifecycle";
import { HEALTH_LABEL, HEALTH_TONE, formatBps, formatDate } from "./lifecycle-format";

type HealthFilter = "critical" | "at_risk" | "healthy" | "unscored";

const FILTERS: { value: HealthFilter; label: string; icon: typeof AlertTriangle }[] = [
  { value: "critical", label: "Critical", icon: AlertTriangle },
  { value: "at_risk", label: "At risk", icon: Activity },
  { value: "healthy", label: "Healthy", icon: HeartPulse },
  { value: "unscored", label: "Unscored", icon: RefreshCw },
];

export function HealthView() {
  const [filter, setFilter] = useState<HealthFilter>("critical");
  const [pendingPartyId, setPendingPartyId] = useState<string | null>(null);
  const display = useOrgDisplay();
  const canManage = useCan("crm:customer-health:manage");
  const recompute = useRecomputeCustomerHealth();

  const health = useCustomerHealthRoster(
    filter === "unscored"
      ? { unscored: true, limit: 100 }
      : { band: filter as CustomerHealthBand, limit: 100 },
  );

  const handleFilter = useCallback((value: string) => setFilter(value as HealthFilter), []);
  const handleRecompute = useCallback(
    (partyId: string) => {
      setPendingPartyId(partyId);
      recompute.mutate(partyId, {
        onSuccess: () => {
          toast.success("Health recomputed");
          setPendingPartyId(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          setPendingPartyId(null);
        },
      });
    },
    [recompute],
  );

  if (useCanState("crm:customer-health:view") === "denied")
    return <NoPermissionState permission="crm:customer-health:view" />;

  const rows = health.data?.data ?? [];

  return (
    <PageWrapper
      title="Customer Health"
      subtitle="Stored scores with coverage and last computation, worst customers first."
      filters={
        <Tabs value={filter} onValueChange={handleFilter}>
          <TabsList>
            {FILTERS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {health.isLoading ? (
        <HealthSkeleton />
      ) : health.error ? (
        <ErrorState
          title="Couldn't load customer health"
          description={getErrorMessage(health.error)}
          onRetry={() => void health.refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="px-1 py-12 text-center text-sm text-muted-foreground">
          No customers match this health view.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[780px]">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Band</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead>Computed</TableHead>
                {canManage ? <TableHead className="w-28" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.customerHealthAssessmentId}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.partyName ?? row.partyId}</div>
                      <div className="text-xs text-muted-foreground">{row.partyId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.healthStatus ? (
                      <Badge variant="secondary" className={HEALTH_TONE[row.healthStatus]}>
                        {HEALTH_LABEL[row.healthStatus]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unscored</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.score ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBps(row.coverageBps, display.locale)}
                  </TableCell>
                  <TableCell>{formatDate(row.computedAt, display.locale)}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingPartyId === row.partyId}
                        onClick={() => handleRecompute(row.partyId)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {pendingPartyId === row.partyId ? "Running" : "Run"}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}

function HealthSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
