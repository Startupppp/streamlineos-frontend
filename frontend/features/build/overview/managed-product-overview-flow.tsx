"use client";

import Link from "next/link";
import {
  ChevronRight,
  Lightbulb,
  Map,
  MessageSquareText,
  Rocket,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";
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

const STAGE_ICONS: Record<ValueStreamStage["id"], LucideIcon> = {
  feedback: MessageSquareText,
  themed: Tags,
  opportunities: Lightbulb,
  roadmap: Map,
  shipped: Rocket,
  measured: Target,
};

function StageLink({
  stage,
  isLast,
}: {
  stage: ValueStreamStage;
  isLast: boolean;
}) {
  const Icon = STAGE_ICONS[stage.id];
  return (
    <div className="relative h-full min-w-0">
      <Link
        href={stage.href}
        aria-label={`${stage.label}: ${stage.value}. ${stage.hint}`}
        className="group relative flex min-h-20 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border border-transparent bg-card/70 px-2.5 py-2.5 transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none sm:min-h-24 sm:flex-col sm:items-start sm:gap-1.5 sm:px-3 sm:py-3"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground shadow-xs transition-colors duration-200 group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary motion-reduce:transition-none sm:size-7">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 sm:w-full">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground motion-reduce:transition-none">
              {stage.label}
            </span>
          </span>
          <span className="mt-0.5 block font-mono text-xl font-semibold leading-none tabular-nums tracking-tight text-foreground sm:text-2xl">
            {stage.value}
          </span>
          <span className="mt-1 block truncate text-micro leading-4 text-muted-foreground">
            {stage.hint}
          </span>
        </span>
        <span className="absolute inset-x-2.5 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-primary transition-transform duration-200 group-hover:scale-x-100 motion-reduce:transition-none" aria-hidden />
      </Link>
      {isLast ? null : (
        <ChevronRight
          aria-hidden
          className="pointer-events-none absolute -right-2.5 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-card text-muted-foreground lg:block"
        />
      )}
    </div>
  );
}

export function ManagedProductOverviewFlow({
  managedProductId,
  summary,
}: FlowProps) {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const stages = deriveValueStream(summary, managedProductId);
  return (
    <OverviewPanel
      title="Signal to outcome"
      description="How customer evidence travels through discovery, delivery and measurement."
    >
      <motion.ol
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        aria-label="Signal to outcome"
        className="relative grid grid-cols-1 gap-1.5 rounded-2xl border border-border/70 bg-muted/30 p-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-1 lg:p-2"
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
