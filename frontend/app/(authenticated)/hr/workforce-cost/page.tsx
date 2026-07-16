"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Calendar } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import {
  useWorkforceCostSummary,
  useCostByDepartment,
  useCostByLocation,
} from "@/hooks/api/hr/enterprise-comp";

function formatCents(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return `$${(n / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function WorkforceCostPage() {
  const canView = useCan("hr:analytics:read");
  const [periodKey, setPeriodKey] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [periodInput, setPeriodInput] = useState(periodKey);

  const { data: summary, isLoading: summaryLoading } = useWorkforceCostSummary();
  const { data: byDept, isLoading: deptLoading } = useCostByDepartment(periodKey);
  const { data: byLoc, isLoading: locLoading } = useCostByLocation();

  if (!canView) {
    return (
      <PageWrapper title="Workforce Costing" subtitle="Cost analytics by department and location" variant="display">
        <p className="text-sm text-muted-foreground">You do not have permission to view workforce cost data.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
        title="Workforce Costing"
        subtitle="Real-time cost breakdown by department and location"
 variant="display">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* Summary */}
          {summaryLoading ? (
            <StatCardGridSkeleton cols={3} />
          ) : (
            <StatCardGrid cols={3}>
              <StatCard label="Total Headcount" value={String(summary?.total_headcount ?? "—")} hint="Active employees" icon={Users} tone="blue" />
              <StatCard label="Monthly Cost" value={formatCents(summary?.total_monthly_cost_cents)} hint="All active employees" icon={DollarSign} tone="emerald" />
              <StatCard label="Annual CTC" value={formatCents(summary?.total_annual_ctc_cents)} hint="Total compensation" icon={Calendar} tone="blue" />
            </StatCardGrid>
          )}

          {/* Period selector */}
          <div className="flex items-center gap-3">
            <Input
              className="w-36 h-8 text-sm"
              placeholder="YYYY-MM"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => setPeriodKey(periodInput)}>
              Apply
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Department */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Cost by Department</p>
              {deptLoading ? (
                <div className="space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : !byDept?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No department cost data</p>
              ) : (
                <div className="space-y-2">
                  {byDept.map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{String(row["department_name"] ?? "—")}</p>
                        <p className="text-xs text-muted-foreground">{String(row["headcount"] ?? 0)} employees</p>
                      </div>
                      <p className="text-sm font-bold text-primary">{formatCents(row["monthly_cost_cents"])}/mo</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Location */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Cost by Location</p>
              {locLoading ? (
                <div className="space-y-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : !byLoc?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No location cost data</p>
              ) : (
                <div className="space-y-2">
                  {byLoc.map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{String(row["location_id"] === "unassigned" ? "Unassigned" : `Location ${row["location_id"]}`)}</p>
                        <p className="text-xs text-muted-foreground">{String(row["headcount"] ?? 0)} employees</p>
                      </div>
                      <p className="text-sm font-bold text-primary">{formatCents(row["monthly_cost_cents"])}/mo</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </PageWrapper>
  );
}
