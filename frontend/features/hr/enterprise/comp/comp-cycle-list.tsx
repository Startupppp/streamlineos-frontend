"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompCycles, type CompCycle } from "@/hooks/api/hr/enterprise-comp";

interface Props {
  onSelect: (cycle: CompCycle) => void;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  active: "default",
  calibrating: "outline",
  approved: "default",
  closed: "secondary",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function CompCycleList({ onSelect }: Props) {
  const { data, isLoading } = useCompCycles();
  const cycles = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  if (!cycles.length) {
    return (
      <EmptyState
        illustrationPreset="default"
        title="No compensation cycles"
        description="Create an annual increment cycle to start the compensation planning process"
        compact
        className="h-64 border-0 shadow-none"
      />
    );
  }

  return (
    <div className="space-y-3">
      {cycles.map((cycle, idx) => (
        <motion.div
          key={cycle.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.05 }}
          className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelect(cycle)}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{cycle.name}</p>
              <Badge variant={STATUS_VARIANT[cycle.status]} className="capitalize text-[11px]">{cycle.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">FY {cycle.fiscalYear} · Budget {formatCents(cycle.budgetPoolCents)}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}
