"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { CircleCheckIcon, SquareArrowOutUpRightIcon } from "@animateicons/react/lucide";
import type { ComponentType } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import type { StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { AttentionSignal } from "./overview-attention-signals";
import { OverviewPanel } from "./overview-metric";

const TONE_ICON: Readonly<Record<StatusTone, ComponentType<{ className?: string }>>> = {
  danger: OctagonAlert,
  warning: AlertTriangle,
  info: Info,
  neutral: Info,
  success: CheckCircle2,
};

interface AttentionPanelProps {
  signals: ReadonlyArray<AttentionSignal>;
  onMarkReviewed?: () => void;
  isMarkingReviewed?: boolean;
  className?: string;
}

interface AttentionRowProps {
  signal: AttentionSignal;
  onMarkReviewed?: () => void;
  isMarkingReviewed?: boolean;
}

function AttentionAction({ signal, onMarkReviewed, isMarkingReviewed }: AttentionRowProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (signal.resolvedByReview) {
    if (!onMarkReviewed) return null;
    return (
      <LoadingButton
        type="button"
        variant="ghost"
        size="sm"
        isPending={isMarkingReviewed}
        loadingText="Saving…"
        onClick={onMarkReviewed}
        className="min-h-11 w-full shrink-0 justify-center text-sm font-medium text-primary sm:min-h-9 sm:w-auto sm:justify-start sm:self-center"
        {...hoverHandlers}
      >
        <CircleCheckIcon ref={iconRef} size={14} aria-hidden />
        {signal.actionLabel}
      </LoadingButton>
    );
  }
  return (
    <Link
      href={signal.href}
      className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1 rounded-md border border-border bg-card px-2.5 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:min-h-9 sm:w-auto sm:justify-start sm:self-center"
      {...hoverHandlers}
    >
      {signal.actionLabel}
      <SquareArrowOutUpRightIcon
        ref={iconRef}
        size={14}
        aria-hidden
      />
    </Link>
  );
}

function AttentionRow({ signal, onMarkReviewed, isMarkingReviewed, featured }: AttentionRowProps & { featured: boolean }) {
  const tone = statusToneClasses(signal.tone);
  const Icon = TONE_ICON[signal.tone];
  return (
    <li
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        featured
          ? cn("mb-3 rounded-lg border p-3 last:mb-0", tone.surface, tone.rule)
          : "border-b border-border py-3 last:border-b-0",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex shrink-0 items-center justify-center rounded-md",
            featured ? cn("size-9 border bg-card", tone.rule) : cn("size-7", tone.surface),
            tone.ink,
          )}
        >
          <Icon className={featured ? "size-4" : "size-3.5"} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className={cn("text-foreground", featured ? "text-sm font-semibold" : "text-sm font-medium")}>{signal.title}</p>
          <p className="text-pretty text-xs text-muted-foreground">{signal.detail}</p>
        </div>
      </div>
      <AttentionAction signal={signal} onMarkReviewed={onMarkReviewed} isMarkingReviewed={isMarkingReviewed} />
    </li>
  );
}

export function ManagedProductOverviewAttention({
  signals,
  onMarkReviewed,
  isMarkingReviewed,
  className,
}: AttentionPanelProps) {
  const urgent = signals.filter((signal) => signal.tone === "danger" || signal.tone === "warning").length;
  const leadId = signals.find((signal) => signal.tone === "danger" || signal.tone === "warning")?.id;
  const description =
    signals.length === 0
      ? "Nothing needs a decision right now."
      : urgent > 0
        ? `${urgent} urgent · ${signals.length - urgent} to tidy up`
        : `${signals.length} to tidy up`;
  return (
    <OverviewPanel title="Needs attention" description={description} className={className}>
      {signals.length === 0 ? (
        <div
          className={cn(
            "flex flex-1 items-center gap-3 rounded-lg border px-3 py-4",
            statusToneClasses("success").surface,
            statusToneClasses("success").rule,
          )}
        >
          <CheckCircle2 aria-hidden className={cn("size-5 shrink-0", statusToneClasses("success").ink)} />
          <p className={cn("text-sm font-medium", statusToneClasses("success").inkStrong)}>
            Strategy, evidence and delivery are all in good shape.
          </p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col">
          {signals.map((signal) => (
            <AttentionRow
              key={signal.id}
              signal={signal}
              featured={signal.id === leadId}
              onMarkReviewed={onMarkReviewed}
              isMarkingReviewed={isMarkingReviewed}
            />
          ))}
        </ul>
      )}
    </OverviewPanel>
  );
}
