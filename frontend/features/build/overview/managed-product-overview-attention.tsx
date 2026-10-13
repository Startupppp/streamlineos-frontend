"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ComponentType } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import type { StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
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
        className="ml-8 min-h-11 shrink-0 text-xs font-medium text-primary sm:ml-0 sm:min-h-8"
      >
        {signal.actionLabel}
      </LoadingButton>
    );
  }
  return (
    <Link
      href={signal.href}
      className="group ml-8 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 text-xs font-medium text-primary shadow-xs transition-[color,background-color,border-color,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none sm:ml-0 sm:min-h-8"
    >
      {signal.actionLabel}
      <ArrowUpRight
        aria-hidden
        className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

function AttentionRow({ signal, onMarkReviewed, isMarkingReviewed }: AttentionRowProps) {
  const tone = statusToneClasses(signal.tone);
  const Icon = TONE_ICON[signal.tone];
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/60 bg-muted/15 p-2.5 transition-colors hover:bg-muted/35 motion-reduce:transition-none">
      <span
        aria-hidden
        className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md", tone.surface, tone.ink)}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-40 flex-1 basis-0 flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">{signal.title}</p>
        <p className="text-xs text-muted-foreground">{signal.detail}</p>
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
        <ul className="flex flex-1 flex-col gap-2">
          {signals.map((signal) => (
            <AttentionRow
              key={signal.id}
              signal={signal}
              onMarkReviewed={onMarkReviewed}
              isMarkingReviewed={isMarkingReviewed}
            />
          ))}
        </ul>
      )}
    </OverviewPanel>
  );
}
