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
import { cn } from "@/lib/utils";
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

const STAGE_STYLES: Record<ValueStreamStage["id"], { surface: string; icon: string; accent: string }> = {
  feedback: {
    surface: "border-status-info-rule/70 bg-status-info-surface/45",
    icon: "bg-status-info-surface text-status-info-ink",
    accent: "bg-status-info-fill",
  },
  themed: {
    surface: "border-border/80 bg-muted/45",
    icon: "bg-muted text-muted-foreground",
    accent: "bg-muted-foreground/60",
  },
  opportunities: {
    surface: "border-status-warning-rule/70 bg-status-warning-surface/45",
    icon: "bg-status-warning-surface text-status-warning-ink",
    accent: "bg-status-warning-fill",
  },
  roadmap: {
    surface: "border-primary/25 bg-primary/5",
    icon: "bg-primary/10 text-primary",
    accent: "bg-primary",
  },
  shipped: {
    surface: "border-status-success-rule/70 bg-status-success-surface/45",
    icon: "bg-status-success-surface text-status-success-ink",
    accent: "bg-status-success-fill",
  },
  measured: {
    surface: "border-border/80 bg-secondary/70",
    icon: "bg-secondary text-secondary-foreground",
    accent: "bg-secondary-foreground/60",
  },
};

function StageLink({
  stage,
  isLast,
}: {
  stage: ValueStreamStage;
  isLast: boolean;
}) {
  const Icon = STAGE_ICONS[stage.id];
  const style = STAGE_STYLES[stage.id];
  return (
    <div className="relative h-full min-w-0">
      <Link
        href={stage.href}
        aria-label={`${stage.label}: ${stage.value}. ${stage.hint}`}
        className={cn(
          "group relative flex min-h-16 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-lg border px-2.5 py-2 transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none sm:min-h-20 sm:items-start sm:px-3 sm:py-2.5",
          style.surface,
        )}
      >
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none", style.icon)}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground motion-reduce:transition-none">
              {stage.label}
            </span>
          </span>
          <span className="mt-0.5 block font-mono text-lg font-semibold leading-none tabular-nums tracking-tight text-foreground">
            {stage.value}
          </span>
          <span className="mt-1 block truncate text-micro leading-3 text-muted-foreground">
            {stage.hint}
          </span>
        </span>
        <span className={cn("absolute inset-x-2.5 bottom-0 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-200 group-hover:scale-x-100 motion-reduce:transition-none", style.accent)} aria-hidden />
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
        className="relative grid grid-cols-1 gap-1 rounded-lg bg-muted/35 p-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
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
