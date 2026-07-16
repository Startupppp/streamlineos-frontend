"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatINRCompact } from "@/lib/format-utils";
import type { Deal, DealStage } from "@/types/crm";

const STAGE_DOT: Partial<Record<DealStage, string>> = {
  LEAD: "bg-blue-500",
  CONTACTED: "bg-sky-500",
  PROPOSAL: "bg-amber-500",
  NEGOTIATION: "bg-blue-500",
  WON: "bg-emerald-500",
  LOST: "bg-red-500",
};

const STAGE_LABEL: Partial<Record<DealStage, string>> = {
  LEAD: "Lead",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

interface DealWithCloseDate extends Deal {
  expectedCloseDate: string;
}

interface BucketConfig {
  label: string;
  minDays: number;
  maxDays: number;
}

const BUCKETS: BucketConfig[] = [
  { label: "This Month", minDays: 0, maxDays: 30 },
  { label: "Next Month", minDays: 31, maxDays: 60 },
  { label: "In 3 Months", minDays: 61, maxDays: 90 },
];

function formatCloseDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPastDue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

interface DealRowProps {
  deal: DealWithCloseDate;
  delay: number;
  onNavigate: (id: number) => void;
  shouldReduceMotion: boolean;
}

function DealRow({ deal, delay, onNavigate, shouldReduceMotion }: DealRowProps) {
  const handleClick = useCallback(() => onNavigate(deal.id), [deal.id, onNavigate]);
  const past = isPastDue(deal.expectedCloseDate);

  return (
    <motion.button
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={{ delay: shouldReduceMotion ? 0 : delay, duration: 0.22, ease: "easeOut" }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/30 border border-transparent hover:border-border transition-all duration-150 text-left"
    >
      <div className="min-w-0 flex-1">
        <TruncatedText text={deal.name} className="text-sm font-medium" />
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STAGE_DOT[deal.stage] ?? "bg-muted-foreground"}`} />
          <span className="text-[11px] text-muted-foreground">
            {STAGE_LABEL[deal.stage] ?? deal.stage}
          </span>
          {deal.assignedTo?.name && (
            <>
              <span className="text-[11px] text-muted-foreground">·</span>
              <TruncatedText text={deal.assignedTo.name ?? "—"} className="text-[11px] text-muted-foreground" />
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-semibold tabular-nums">
          {deal.value ? formatINRCompact(Number(deal.value)) : "—"}
        </p>
        <p className={`text-[11px] tabular-nums ${past ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
          {formatCloseDate(deal.expectedCloseDate)}
        </p>
      </div>
    </motion.button>
  );
}

interface DealCloseDateListProps {
  deals: Deal[];
}

export function DealCloseDateList({ deals }: DealCloseDateListProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion() ?? false;

  const handleNavigate = useCallback(
    (id: number) => router.push(`/crm/deals/${id}`),
    [router],
  );

  const now = useMemo(() => new Date(), []);

  const bucketedDeals = useMemo(() => {
    const eligible = deals.filter(
      (d): d is DealWithCloseDate =>
        d.stage !== "LOST" && d.expectedCloseDate != null && d.expectedCloseDate !== "",
    );

    return BUCKETS.map((bucket) => ({
      label: bucket.label,
      deals: eligible.filter((d) => {
        const close = new Date(d.expectedCloseDate);
        const diffMs = close.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= bucket.minDays - 30 && diffDays <= bucket.maxDays;
      }),
    }));
  }, [deals, now]);

  const hasAny = bucketedDeals.some((b) => b.deals.length > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Closing Soon</CardTitle>
        <p className="text-xs text-muted-foreground">Deals by expected close date</p>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No deals closing in the next 90 days.
          </p>
        ) : (
          <div className="space-y-6">
            {bucketedDeals.map((bucket) => (
              <div key={bucket.label}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {bucket.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({bucket.deals.length})
                  </span>
                </div>
                {bucket.deals.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-1">No deals.</p>
                ) : (
                  <div className="space-y-1">
                    {bucket.deals.map((deal, idx) => (
                      <DealRow
                        key={deal.id}
                        deal={deal}
                        delay={idx * 0.06}
                        onNavigate={handleNavigate}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
