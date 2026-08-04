"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrIconWell } from "@/features/hr/shared/hr-ui";
import { cn } from "@/lib/utils";
import type { ModuleChecklistItem } from "@/hooks/api/onboarding-flow";

export function HrChecklistItem({
  item,
  index = 0,
  onSkip,
  skipPending,
}: {
  item: ModuleChecklistItem;
  index?: number;
  onSkip?: (itemKey: string) => void;
  skipPending?: boolean;
}) {
  const done = item.status === "done";
  const skipped = item.status === "skipped";
  const resolved = done || skipped;

  return (
    <motion.li
      data-tour={`hr-checklist-item-${item.itemKey}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.06 }}
      layout
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-start sm:gap-4",
        resolved && "opacity-70",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={done ? "done" : skipped ? "skipped" : "todo"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <HrIconWell tone={done ? "emerald" : skipped ? "slate" : "blue"} size="lg">
            {done ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : skipped ? (
              <SkipForward className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4" aria-hidden="true" />
            )}
          </HrIconWell>
        </motion.div>
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-semibold text-foreground",
              resolved && "line-through decoration-muted-foreground/50",
            )}
          >
            {item.title}
          </p>
          {!item.required && (
            <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Optional
            </span>
          )}
          {skipped && (
            <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Skipped
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
        {!resolved && !item.required && onSkip && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            disabled={skipPending}
            onClick={() => onSkip(item.itemKey)}
          >
            Skip
          </Button>
        )}
        {item.actionHref && (
          <Button variant={resolved ? "outline" : "default"} asChild>
            <Link href={item.actionHref}>
              {resolved ? "Review" : "Go to setup"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </motion.li>
  );
}
