"use client";

import Link from "next/link";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

interface ActionCardProps {
  title: string;
  value: string | number;
  description: string;
  href: string;
  Icon: AnimatedNavIconComponent;
  tone?: "default" | "amber" | "red";
}

const TONE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  amber: { bg: "bg-status-warning-surface", text: "text-status-warning-ink", border: "border-status-warning-rule" },
  red: { bg: "bg-status-danger-surface", text: "text-status-danger-ink", border: "border-status-danger-rule" },
};

export function ActionCard({
  title,
  value,
  description,
  href,
  Icon,
  tone = "default",
}: ActionCardProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.default;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-xl border bg-card p-3 transition-all duration-150 hover:bg-muted/30 hover:shadow-sm",
        styles.border,
      )}
      {...hoverHandlers}
    >
      <div className={cn("w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5", styles.bg)}>
        <Icon ref={iconRef} className={cn("h-4 w-4", styles.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold tabular-nums text-foreground leading-tight">{value}</p>
        <TruncatedText text={description} className="text-micro text-muted-foreground mt-0.5" />
      </div>
    </Link>
  );
}
