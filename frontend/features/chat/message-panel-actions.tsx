"use client";

import React from "react";
import { BookmarkIcon, PaperclipIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";

export const PaperclipButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function PaperclipButton({ className, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return <button ref={ref} {...hoverHandlers} className={className} {...props}><PaperclipIcon ref={iconRef} size={16} /></button>;
  },
);

export const BookmarkButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }>(
  function BookmarkButton({ className, active, ...props }, ref) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();
    return <button ref={ref} {...hoverHandlers} className={className} {...props}><BookmarkIcon ref={iconRef} size={16} className={cn(active && "fill-amber-500 text-status-warning-ink")} /></button>;
  },
);
