"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";

const SectionToggleButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { collapsed: boolean }
>(function SectionToggleButton({ collapsed, className, children, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
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
  return (
    <div className="mb-1">
      <SectionToggleButton
        collapsed={collapsed}
        onClick={onToggle}
        className="w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count > 0 && (
          <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </SectionToggleButton>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
