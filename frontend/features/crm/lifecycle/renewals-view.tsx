"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownAZ, CalendarClock, Gauge, ScrollText } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { useCan, useCanState } from "@/hooks/api/access";
import { useCustomerLifecycles } from "@/hooks/api/crm/lifecycle";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ListLifecyclesParams } from "@/types/crm/lifecycle";
import {
  RISK_LABEL,
  RISK_TONE,
  STATUS_LABEL,
  formatDate,
  formatMinor,
} from "./lifecycle-format";
import { LifecycleDetailSheet } from "./lifecycle-detail-sheet";
import { RenewalSweepDialog } from "./renewal-sweep-dialog";
import { TriggerLogPanel } from "./trigger-log-panel";

type RenewalFilter = "upcoming" | "risk" | "all" | "log";

const FILTERS: { value: RenewalFilter; label: string; icon: typeof CalendarClock }[] = [
  { value: "upcoming", label: "Upcoming", icon: CalendarClock },
  { value: "risk", label: "At risk", icon: Gauge },
  { value: "all", label: "All", icon: ArrowDownAZ },
  { value: "log", label: "Trigger log", icon: ScrollText },
];

export function RenewalsView() {
  const [filter, setFilter] = useState<RenewalFilter>("upcoming");
  const display = useOrgDisplay();

  const params = useMemo<ListLifecyclesParams>(() => {
    if (filter === "upcoming")
      return { status: "active", renewingWithinDays: 90, order: "renewal", limit: 100 };
    if (filter === "risk")
      return { status: "active", band: "at-risk", order: "risk", limit: 100 };
    return { order: "renewal", limit: 100 };
  }, [filter]);

  const lifecycles = useCustomerLifecycles(params);
  const canRunSweep = useCan("crm:lifecycle-triggers:run");
  const canViewTriggers = useCanState("crm:lifecycle-triggers:view") !== "denied";
  const tabs = useMemo(
    () => (canViewTriggers ? FILTERS : FILTERS.filter((entry) => entry.value !== "log")),
    [canViewTriggers],
  );
  const [selected, setSelected] = useState<{ id: string; partyName: string | null } | null>(null);
  const [sweepOpen, setSweepOpen] = useState(false);
  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setSelected(null);
  }, []);
  const handleOpenSweep = useCallback(() => setSweepOpen(true), []);
  const handleDetails = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const id = event.currentTarget.dataset.lifecycleId;
      const row = lifecycles.data?.data.find((entry) => entry.customerLifecycleId === id);
      if (row) setSelected({ id: row.customerLifecycleId, partyName: row.partyName });
    },
    [lifecycles.data],
  );
  const partyNames = useMemo(
    () =>
      new Map(
        (lifecycles.data?.data ?? []).flatMap((row) =>
          row.partyName ? [[row.partyId, row.partyName] as const] : [],
        ),
      ),
    [lifecycles.data],
  );
  const handleFilter = useCallback((value: string) => {
    const next = FILTERS.find((entry) => entry.value === value);
    if (next) setFilter(next.value);
  }, []);

  if (useCanState("crm:lifecycle:view") === "denied")
    return <NoPermissionState permission="crm:lifecycle:view" />;

  const rows = lifecycles.data?.data ?? [];

  return (
    <PageWrapper
      title="Renewals"
      subtitle="Recurring revenue ordered by date, risk and account evidence."
      actions={
        canRunSweep ? (
          <Button size="sm" onClick={handleOpenSweep}>
            Run renewal sweep
          </Button>
        ) : undefined
      }
      filters={
        <Tabs value={filter} onValueChange={handleFilter}>
          <TabsList>
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    >
      {filter === "log" ? (
        <TriggerLogPanel locale={display.locale} />
      ) : lifecycles.isLoading ? (
        <RenewalsSkeleton />
      ) : lifecycles.error ? (
        <ErrorState
          title="Couldn't load renewals"
          description={getErrorMessage(lifecycles.error)}
          onRetry={() => void lifecycles.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          illustrationPreset="report"
          title="No renewals in this view"
          description="No renewals match this view."
          className="flex-1 min-h-0"
        />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.customerLifecycleId}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{row.partyName ?? row.partyId}</div>
                      <div className="text-xs text-muted-foreground">{row.partyId}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(row.renewalOn, display.locale)}</TableCell>
                  <TableCell>{`${row.termMonths} mo · ${row.renewalCount} renewal${row.renewalCount === 1 ? "" : "s"}`}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinor(row.contractValueMinor, display.currency, display.locale)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={RISK_TONE[row.band]}>
                      {RISK_LABEL[row.band]} · {row.riskScore}
                    </Badge>
                  </TableCell>
                  <TableCell>{STATUS_LABEL[row.status]}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-lifecycle-id={row.customerLifecycleId}
                        onClick={handleDetails}
                      >
                        Details
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/crm/deals/${row.sourceDealId}`}>Deal</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <LifecycleDetailSheet
        customerLifecycleId={selected?.id ?? null}
        partyName={selected?.partyName ?? null}
        currency={display.currency}
        locale={display.locale}
        onOpenChange={handleSheetOpenChange}
      />
      <RenewalSweepDialog open={sweepOpen} onOpenChange={setSweepOpen} partyNames={partyNames} />
    </PageWrapper>
  );
}

function RenewalsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
