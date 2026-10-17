"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";

const SectionToggleButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { collapsed: boolean }
>(function SectionToggleButton({ collapsed, className, children, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} type="button" {...hoverHandlers} className={className} {...props}>
      {collapsed ? (
        <ChevronRightIcon ref={iconRef} size={12} />
      ) : (
        <ChevronDownIcon ref={iconRef} size={12} />
      )}
      {children}
    </button>
  );
});

export function ChannelSidebarSection({
  title,
  count,
  collapsed,
  onToggle,
  children,
  icon,
}: {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="mb-1">
      <SectionToggleButton
        collapsed={collapsed}
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex min-h-11 w-full items-center gap-1 rounded-lg px-2 text-left text-dense font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-micro font-bold tabular-nums text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </SectionToggleButton>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
