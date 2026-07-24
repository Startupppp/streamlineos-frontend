"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiGeneratedLabel } from "./ai-generated-label";
import { AiConfidenceBadge } from "./ai-confidence-badge";
import { AiCitationChips, type Citation } from "./ai-citation-chips";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AiUsageChip, type AiUsageMeta } from "./ai-usage-chip";

interface AiDraftCardProps {
  children: React.ReactNode;
  title?: string;
  timestamp?: string | Date;
  confidence?: number;
  citations?: Citation[];
  usage?: AiUsageMeta | null;
  onAccept?: () => void;
  onEdit?: () => void;
  onDiscard?: () => void;
  acceptLabel?: string;
  isAcceptPending?: boolean;
  hideFooter?: boolean;
  className?: string;
}

export function AiDraftCard({
  children,
  title,
  timestamp,
  confidence,
  citations,
  usage,
  onAccept,
  onEdit,
  onDiscard,
  acceptLabel = "Accept",
  isAcceptPending = false,
  hideFooter = false,
  className,
}: AiDraftCardProps) {
  const hasFooter = !hideFooter && (onAccept || onEdit || onDiscard);
  const hasCitations = citations && citations.length > 0;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <AiGeneratedLabel timestamp={timestamp} />
        {title && (
          <TruncatedText text={title} className="flex-1 text-[12px] font-medium text-foreground" />
        )}
        {confidence !== undefined && (
          <AiConfidenceBadge confidence={confidence} />
        )}
        <AiUsageChip usage={usage} className="ml-auto" />
      </div>

      <div className="px-3 py-3">{children}</div>

      {hasCitations && (
        <div className="border-t border-border px-3 pb-2 pt-2">
          <AiCitationChips citations={citations} />
        </div>
      )}

      {hasFooter && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
          {onAccept && (
            <LoadingButton
              size="sm"
              isPending={isAcceptPending}
              onClick={onAccept}
              className="h-7 text-xs"
            >
              {acceptLabel}
            </LoadingButton>
          )}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-7 text-xs"
            >
              Edit
            </Button>
          )}
          {onDiscard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Discard
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
