"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownAZ, CalendarClock, Gauge } from "lucide-react";
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
import { useCanState } from "@/hooks/api/access";
import { useCustomerLifecycles } from "@/hooks/api/crm/lifecycle";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import type { LifecycleRiskBand } from "@/types/crm/lifecycle";
import {
  RISK_LABEL,
  RISK_TONE,
  STATUS_LABEL,
  formatDate,
  formatMinor,
} from "./lifecycle-format";

type RenewalFilter = "upcoming" | "risk" | "all";

const FILTERS: { value: RenewalFilter; label: string; icon: typeof CalendarClock }[] = [
  { value: "upcoming", label: "Upcoming", icon: CalendarClock },
  { value: "risk", label: "At risk", icon: Gauge },
  { value: "all", label: "All", icon: ArrowDownAZ },
];

export function RenewalsView() {
  const [filter, setFilter] = useState<RenewalFilter>("upcoming");
  const display = useOrgDisplay();

  const params = useMemo(() => {
    if (filter === "upcoming")
      return { status: "active" as const, renewingWithinDays: 90, order: "renewal" as const, limit: 100 };
    if (filter === "risk")
      return { status: "active" as const, band: "at-risk" as LifecycleRiskBand, order: "risk" as const, limit: 100 };
    return { order: "renewal" as const, limit: 100 };
  }, [filter]);

  const lifecycles = useCustomerLifecycles(params);
  const handleFilter = useCallback((value: string) => setFilter(value as RenewalFilter), []);

  if (useCanState("crm:lifecycle:view") === "denied")
    return <NoPermissionState permission="crm:lifecycle:view" />;

  const rows = lifecycles.data?.data ?? [];

  return (
    <PageWrapper
      title="Renewals"
      subtitle="Recurring revenue ordered by date, risk and account evidence."
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
      {lifecycles.isLoading ? (
        <RenewalsSkeleton />
      ) : lifecycles.error ? (
        <ErrorState
          title="Couldn't load renewals"
          description={getErrorMessage(lifecycles.error)}
          onRetry={() => void lifecycles.refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="px-1 py-12 text-center text-sm text-muted-foreground">
          No renewals match this view.
        </p>
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
                <TableHead className="w-24" />
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
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/crm/deals/${row.sourceDealId}`}>Deal</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
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
