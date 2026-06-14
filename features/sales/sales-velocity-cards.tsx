"use client";

import { motion } from "framer-motion";
import { Zap, CalendarClock, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-utils";
import { fadeUp } from "@/lib/motion-variants";
import type { DealVelocityResult, AgingDealResult, CycleLengthResult, LostAnalysisResult } from "@/lib/api/hooks/crm/analytics";

interface SalesVelocityCardsProps {
  velocityData: DealVelocityResult | undefined;
  cycleData: CycleLengthResult | undefined;
  lostData: LostAnalysisResult | undefined;
  agingData: AgingDealResult[] | undefined;
}

export function SalesVelocityCards({
  velocityData,
  cycleData,
  lostData,
  agingData,
}: SalesVelocityCardsProps) {
  return (
    <motion.div className="grid gap-4 lg:grid-cols-2" variants={fadeUp}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Deal Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {velocityData?.dealCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No closed deals in this period.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Avg Days to Close</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  {velocityData?.avgDaysToClose ?? "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Median Days to Close</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  {velocityData?.medianDaysToClose ?? "—"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Fastest Close</p>
                <p className="text-xl font-semibold tabular-nums mt-0.5 text-green-600 dark:text-green-400">
                  {velocityData?.fastestCloseDays ?? "—"}d
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Slowest Close</p>
                <p className="text-xl font-semibold tabular-nums mt-0.5 text-red-600 dark:text-red-400">
                  {velocityData?.slowestCloseDays ?? "—"}d
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            Sales Cycle Length
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!cycleData || cycleData.totalDeals === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No closed deals yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Avg Close</p>
                  <p className="text-xl font-semibold tabular-nums mt-0.5">{cycleData.avgDays ?? "—"}d</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Median</p>
                  <p className="text-xl font-semibold tabular-nums mt-0.5">{cycleData.medianDays ?? "—"}d</p>
                </div>
              </div>
              <div className="space-y-2">
                {cycleData.histogram.map((b) => {
                  const maxCount = Math.max(...cycleData.histogram.map((x) => x.count), 1);
                  return (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14 shrink-0">{b.label}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded transition-all"
                          style={{ width: `${(b.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right shrink-0">{b.count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{cycleData.totalDeals} won deals analysed</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserX className="h-4 w-4 text-destructive" />
            Lost Deal Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lostData || lostData.total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No lost deals.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{lostData.total}</strong> lost deals</span>
                <span><strong className="text-foreground">{formatCurrency(lostData.totalValue)}</strong> lost value</span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {lostData.reasons.map((r) => (
                  <div key={r.reason} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="truncate text-muted-foreground max-w-[180px]">{r.reason}</span>
                      <span className="font-medium tabular-nums shrink-0">{r.count} ({r.pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-destructive/60 rounded" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-destructive" />
            Stagnant Deals
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Stagnant &gt;14 days
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(agingData?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No stagnant deals.
            </p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {agingData?.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/5 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium leading-tight">{deal.companyName}</p>
                    <p className="text-xs text-muted-foreground">{deal.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-destructive">
                      {deal.daysSinceUpdate}d stagnant
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(deal.value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
