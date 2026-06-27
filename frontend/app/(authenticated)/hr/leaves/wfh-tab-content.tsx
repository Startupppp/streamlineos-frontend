"use client";

import React, { useState, useMemo } from "react";
import { isBefore, isAfter, format } from "date-fns";
import { motion } from "framer-motion";
import { useHrWfhRequests } from "@/lib/api/hooks/hr";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyWfhIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, TrendingUp, Clock } from "lucide-react";

import { staggerContainer, fadeIn } from "@/lib/motion-variants";
import type { WfhRequest } from "./leaves-shared";
import { WfhRequestItem, StatsCard } from "./leaves-shared";

export function WfhTabContent() {
  const [wfhStatusFilter, setWfhStatusFilter] = useState<string>("ALL");
  const { data: myWfhRequests, isLoading: wfhLoading } = useHrWfhRequests();

  const filteredWfhRequests = useMemo(() => {
    if (!myWfhRequests) return [];
    if (wfhStatusFilter === "ALL") return myWfhRequests;
    return myWfhRequests.filter(
      (r) => (r.status || "PENDING") === wfhStatusFilter,
    );
  }, [myWfhRequests, wfhStatusFilter]);

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
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-3"
        role="list"
        aria-label="WFH statistics"
      >
        <StatsCard
          title="Monthly WFH"
          value={wfhStats.thisMonth}
          subtitle={currentMonth}
          icon={TrendingUp}
          accent="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
        />
        <StatsCard
          title="Pending"
          value={wfhStats.pending}
          subtitle="Awaiting approval"
          icon={Clock}
          accent="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
        />
      </div>

      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                <Home
                  className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400"
                  aria-hidden="true"
                />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">
                My WFH Requests
              </CardTitle>
            </div>
            <Select value={wfhStatusFilter} onValueChange={setWfhStatusFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4" aria-live="polite">
          {wfhLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredWfhRequests.length === 0 ? (
            <EmptyState
              illustration={<EmptyWfhIllustration />}
              title={
                wfhStatusFilter === "ALL"
                  ? "No WFH requests yet"
                  : `No ${wfhStatusFilter.toLowerCase()} requests`
              }
              description="Use the Request WFH button above to submit a new request."
            />
          ) : (
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
          )}
        </CardContent>
      </Card>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}
