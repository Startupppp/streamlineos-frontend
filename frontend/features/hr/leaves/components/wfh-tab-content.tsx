"use client";

import { useMemo, memo } from "react";
import { isBefore, isAfter, format } from "date-fns";
import { motion } from "framer-motion";
import { useHrWfhRequests } from "@/hooks/api/hr";

import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { TrendingUp, Clock } from "lucide-react";

import { useMotionVariants } from "@/lib/motion-variants";
import type { WfhRequest } from "./leaves-shared";
import { WfhRequestItem } from "./leaves-shared";

const WfhStatsStrip = memo(function WfhStatsStrip({
  thisMonth,
  pending,
  currentMonth,
}: {
  thisMonth: number;
  pending: number;
  currentMonth: string;
}) {
  return (
    <StatCardGrid cols={2} aria-label="WFH statistics">
      <StatCard
        label="Monthly WFH"
        value={thisMonth}
        hint={currentMonth}
        icon={TrendingUp}
        tone="emerald"
      />
      <StatCard
        label="Pending"
        value={pending}
        hint="Awaiting approval"
        icon={Clock}
        tone="amber"
      />
    </StatCardGrid>
  );
});

interface WfhTabContentProps {
  compact?: boolean;
  statusFilter?: string;
  onRequestWfh?: () => void;
}

export function WfhTabContent({
  compact = false,
  statusFilter = "ALL",
  onRequestWfh,
}: WfhTabContentProps) {
  const { staggerContainer, fadeIn } = useMotionVariants();
  const { data: myWfhRequests, isLoading: wfhLoading } = useHrWfhRequests();

  const filteredWfhRequests = useMemo(() => {
    if (!myWfhRequests) return [];
    if (statusFilter === "ALL") return myWfhRequests;
    return myWfhRequests.filter(
      (r) => (r.status || "PENDING") === statusFilter,
    );
  }, [myWfhRequests, statusFilter]);

  const wfhStats = useMemo(() => {
    if (!myWfhRequests) return { thisMonth: 0, pending: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      thisMonth: myWfhRequests.filter((r) => {
        const d = new Date(r.date);
        return (
          r.status === "APPROVED" &&
          !isBefore(d, monthStart) &&
          !isAfter(d, monthEnd)
        );
      }).length,
      pending: myWfhRequests.filter(
        (r) => !r.status || r.status === "PENDING",
      ).length,
    };
  }, [myWfhRequests]);

  const currentMonth = format(new Date(), "MMMM yyyy");

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-0 w-full flex-1 flex-col"
          : "w-full space-y-4"
      }
    >
      {!compact && (
        <WfhStatsStrip
          thisMonth={wfhStats.thisMonth}
          pending={wfhStats.pending}
          currentMonth={currentMonth}
        />
      )}

      <div
        className="flex h-full min-h-0 w-full flex-1 flex-col"
        aria-live="polite"
      >
        {wfhLoading ? (
          <div className={PAGE_BODY_SKELETON_CLASS}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredWfhRequests.length === 0 ? (
          <EmptyState
            illustrationPreset="calendar"
            title={
              statusFilter === "ALL"
                ? "No WFH requests yet"
                : `No ${statusFilter.toLowerCase()} requests`
            }
            description="Submit a work-from-home request to see it here."
            action={
              onRequestWfh
                ? { label: "Request WFH", onClick: onRequestWfh }
                : undefined
            }
            className={PAGE_BODY_EMPTY_CLASS}
          />
        ) : (
          <div className="min-h-0 w-full flex-1 overflow-y-auto rounded-xl border border-border bg-card p-3">
            <motion.div
              className="space-y-2"
              role="list"
              aria-label="My WFH requests"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {filteredWfhRequests.map((req) => (
                <motion.div key={req.id} variants={fadeIn}>
                  <WfhRequestItem request={req as WfhRequest} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
