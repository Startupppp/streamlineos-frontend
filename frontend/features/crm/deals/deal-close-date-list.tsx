"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINRCompact } from "@/lib/format-utils";
import type { Deal, DealStage } from "@/types/crm";

const STAGE_DOT: Partial<Record<DealStage, string>> = {
  LEAD: "bg-blue-500",
  CONTACTED: "bg-sky-500",
  PROPOSAL: "bg-amber-500",
  NEGOTIATION: "bg-purple-500",
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

interface DealCloseDateListProps {
  deals: Deal[];
}

interface DealRowProps {
  deal: DealWithCloseDate;
  delay: number;
  onNavigate: (id: number) => void;
}

function DealRow({ deal, delay, onNavigate }: DealRowProps) {
  const handleClick = useCallback(() => onNavigate(deal.id), [deal.id, onNavigate]);
  const past = isPastDue(deal.expectedCloseDate);

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22, ease: "easeOut" }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-150 text-left"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{deal.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STAGE_DOT[deal.stage] ?? "bg-slate-400"}`} />
          <span className="text-[11px] text-muted-foreground">
            {STAGE_LABEL[deal.stage] ?? deal.stage}
          </span>
          {deal.assignedTo?.name && (
            <>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="text-[11px] text-muted-foreground truncate">{deal.assignedTo.name}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <p className="text-sm font-semibold tabular-nums">
          {deal.value ? formatINRCompact(Number(deal.value)) : "—"}
        </p>
        <p className={`text-[11px] tabular-nums ${past ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
          {formatCloseDate(deal.expectedCloseDate)}
        </p>
      </div>
    </motion.button>
  );
}

export function DealCloseDateList({ deals }: DealCloseDateListProps) {
  const router = useRouter();

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
    <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
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
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
