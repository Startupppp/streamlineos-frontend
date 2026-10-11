"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { useMotionVariants } from "@/lib/motion-variants";
import { deriveValueStream } from "./overview-signals";
import type { ValueStreamStage } from "./overview-signals";
import { OverviewPanel } from "./overview-metric";

interface FlowProps {
  managedProductId: number;
  summary: ManagedProductSummary;
}

function StageLink({ stage, isLast }: { stage: ValueStreamStage; isLast: boolean }) {
  return (
    <div className="relative flex min-w-0">
      <Link
        href={stage.href}
        className="group flex min-h-11 w-full min-w-0 flex-col gap-1 rounded-lg px-3 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
          {stage.label}
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{stage.value}</span>
        <span className="truncate text-xs text-muted-foreground">{stage.hint}</span>
      </Link>
      {isLast ? null : (
        <ChevronRight
          aria-hidden
          className="pointer-events-none absolute -right-2.5 top-1/2 hidden size-4 -translate-y-1/2 text-muted-foreground lg:block"
        />
      )}
    </div>
  );
}

export function ManagedProductOverviewFlow({ managedProductId, summary }: FlowProps) {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const stages = deriveValueStream(summary, managedProductId);
  return (
    <OverviewPanel
      title="Signal to outcome"
      description="How customer evidence travels through discovery, delivery and measurement."
    >
      <motion.ol
        aria-label="Signal to outcome"
        className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {stages.map((stage, index) => (
          <motion.li key={stage.id} variants={fadeUp} className="min-w-0">
            <StageLink stage={stage} isLast={index === stages.length - 1} />
          </motion.li>
        ))}
      </motion.ol>
    </OverviewPanel>
  );
}
