"use client";

import { motion } from "framer-motion";
import { LANDING_APPS, type LandingApp } from "../data/apps";
import { MotionReveal } from "./motion/motion-reveal";
import { MotionItem, MotionStagger } from "./motion/motion-reveal";
import { staggerItemDelay } from "./motion/variants";

type IncludedAppsGridProps = {
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

export function IncludedAppsGrid({
  title = "Paid plans include every app for a single fee",
  subtitle = "No per-module pricing. No feature upselling. One seat, full platform.",
  compact = false,
}: IncludedAppsGridProps) {
  return (
    <div className={compact ? "mt-8" : "mt-12"}>
      <MotionReveal className="text-center mb-5 max-w-2xl mx-auto">
        <h3 className="font-display text-base sm:text-lg font-semibold text-muted-foreground tracking-tight">
          {title}
        </h3>
        {subtitle ? (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
        ) : null}
      </MotionReveal>
      <MotionStagger
        className={`grid gap-2 ${
          compact
            ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
        } max-w-5xl mx-auto`}
      >
        {LANDING_APPS.map((app, i) => (
          <MotionItem key={app.id}>
            <AppChip app={app} compact={compact} index={i} />
          </MotionItem>
        ))}
      </MotionStagger>
      {subtitle ? (
        <MotionReveal delay={0.15} className="mt-5 text-center text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
          All plans include hosting, maintenance, and support. No hidden costs, no limits on
          features or data.
        </MotionReveal>
      ) : null}
    </div>
  );
}

function AppChip({
  app,
  compact,
  index,
}: {
  app: LandingApp;
  compact?: boolean;
  index: number;
}) {
  const Icon = app.icon;
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={staggerItemDelay(index, 0)}
      className={`group flex items-center gap-2 rounded-lg border border-border bg-muted/50 transition-colors hover:border-slate-300 hover:bg-white ${
        compact ? "px-2 py-1.5" : "px-3 py-2.5"
      }`}
    >
      <motion.span
        whileHover={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.4 }}
        className="h-7 w-7 rounded-md bg-muted group-hover:bg-status-info-surface inline-flex items-center justify-center shrink-0 transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-status-info-ink" aria-hidden />
      </motion.span>
      <span
        className={`font-medium text-foreground truncate ${
          compact ? "text-dense" : "text-xs"
        }`}
      >
        {app.name}
      </span>
    </motion.div>
  );
}
