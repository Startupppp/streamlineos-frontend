"use client";

import { memo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { MyWorkItem } from "@/types/projects/my-work";
import { cn } from "@/lib/utils";
import {
  listItem,
  listItemReduced,
  pmSnappy,
  pmSpring,
} from "@/lib/motion-presets";
import { PM_ROW } from "@/components/pm-chrome";
import { FLEX_TITLE_SLOT } from "@/lib/text-overflow";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { isOverdue } from "./command-center-rows-model";

export const MyWorkRow = memo(function MyWorkRow({
  item,
  isFocused = false,
}: {
  item: MyWorkItem;
  isFocused?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const overdue = isOverdue(item);
  const { iconRef: chevronRef, hoverHandlers: chevronHoverHandlers } =
    useAnimatedIcon();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      whileHover={shouldReduceMotion ? undefined : { x: 2 }}
      className="min-w-0"
    >
      <Link
        href={getTicketDetailHref(
          item.projectId,
          item.projectKey,
          item.ticketNumber,
        )}
        className={cn(PM_ROW, isFocused && "ring-1 ring-primary/40")}
        aria-current={isFocused ? "true" : undefined}
        {...chevronHoverHandlers}
      >
        <motion.div
          className="shrink-0"
          whileHover={
            shouldReduceMotion ? undefined : { scale: 1.08, rotate: -4 }
          }
          transition={pmSpring}
        >
          <PriorityBadge priority={item.priority} size="sm" />
        </motion.div>
        <div className={FLEX_TITLE_SLOT}>
          <TruncatedText
            text={item.title}
            className="text-label font-medium leading-tight text-foreground transition-colors group-hover:text-primary"
          />
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <span className="shrink-0 font-mono text-micro font-normal text-primary/80">
              {item.projectKey}
            </span>
            <span className="shrink-0 text-micro text-muted-foreground">·</span>
            <TruncatedText
              text={item.projectName}
              className="min-w-0 flex-1 text-micro text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {overdue ? (
            <motion.span
              initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={pmSpring}
            >
              <AlertCircle
                className="h-3.5 w-3.5 text-status-danger-ink"
                aria-label="Overdue"
              />
            </motion.span>
          ) : null}
          <StatusBadge status={item.status} className="text-dense" />
          <ChevronRightIcon
            ref={chevronRef}
            size={12}
            className="-translate-x-1 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
          />
        </div>
      </Link>
    </motion.div>
  );
});
