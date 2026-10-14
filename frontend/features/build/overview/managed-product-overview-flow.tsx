"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ChartLineIcon, LayersIcon, MapPinnedIcon, MessageCircleIcon, RocketIcon, TelescopeIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { useMotionVariants } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { deriveValueStream } from "./overview-signals";
import type { ValueStreamStage } from "./overview-signals";
import { OverviewPanel } from "./overview-metric";

interface FlowProps {
  managedProductId: number;
  summary: ManagedProductSummary;
}

const STAGE_ICONS = {
  feedback: MessageCircleIcon,
  themed: LayersIcon,
  opportunities: TelescopeIcon,
  roadmap: MapPinnedIcon,
  shipped: RocketIcon,
  measured: ChartLineIcon,
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
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const style = STAGE_STYLES[stage.id];
  return (
    <div className="relative h-full min-w-0">
      <Link
        href={stage.href}
        aria-label={`${stage.label}: ${stage.value}. ${stage.hint}`}
        className={cn(
          "group relative flex h-full min-h-20 w-full min-w-0 items-start gap-2.5 overflow-hidden rounded-lg border px-2.5 py-2.5 transition-colors duration-200 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none sm:px-3",
          style.surface,
        )}
        {...hoverHandlers}
      >
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", style.icon)}>
          <Icon ref={iconRef} size={16} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground motion-reduce:transition-none">
            {stage.label}
          </span>
          <span className="font-mono text-lg font-semibold leading-none tabular-nums tracking-tight text-foreground">
            {stage.value}
          </span>
          <span className="line-clamp-2 text-pretty text-xs leading-4 text-muted-foreground">
            {stage.hint}
          </span>
        </span>
        <span className={cn("absolute inset-x-2.5 bottom-0 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-200 group-hover:scale-x-100 motion-reduce:transition-none", style.accent)} aria-hidden />
      </Link>
      {isLast ? null : (
        <ChevronRight
          aria-hidden
          className="pointer-events-none absolute -right-2.5 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-card text-muted-foreground 2xl:block"
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
        className="relative grid min-w-0 grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6"
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
