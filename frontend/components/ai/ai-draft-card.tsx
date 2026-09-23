"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AiGeneratedLabel } from "./ai-generated-label";
import { AiConfidenceBadge } from "./ai-confidence-badge";
import {
  AiCitationChips,
  AiCitationChipsSkeleton,
  type Citation,
} from "./ai-citation-chips";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AiUsageChip, type AiUsageMeta } from "./ai-usage-chip";

interface AiDraftCardProps {
  children: React.ReactNode;
  title?: string;
  timestamp?: string | Date;
  confidence?: number;
  citations?: Citation[];
  citationsPending?: boolean;
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
  citationsPending = false,
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
  const hasCitations = citations !== undefined && citations.length > 0;

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
          <TruncatedText text={title} className="flex-1 text-xs font-medium text-foreground" />
        )}
        {confidence !== undefined && (
          <AiConfidenceBadge confidence={confidence} />
        )}
        <AiUsageChip usage={usage} className="ml-auto" />
      </div>

      <div className="px-3 py-3">{children}</div>

      {citationsPending ? (
        <div className="border-t border-border px-3 pb-2 pt-2">
          <AiCitationChipsSkeleton />
        </div>
      ) : hasCitations ? (
        <div className="border-t border-border px-3 pb-2 pt-2">
          <AiCitationChips citations={citations} />
        </div>
      ) : null}

      {hasFooter && (
        <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
          {onAccept ? (
            <LoadingButton
              size="sm"
              isPending={isAcceptPending}
              onClick={onAccept}
              className="h-9 w-full whitespace-nowrap text-sm"
            >
              {acceptLabel}
            </LoadingButton>
          ) : null}
          {onEdit || onDiscard ? (
            <div className="grid grid-cols-2 gap-2">
              {onEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-9 text-sm"
                >
                  Edit
                </Button>
              ) : null}
              {onDiscard ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDiscard}
                  className="h-9 text-sm text-muted-foreground hover:text-foreground"
                >
                  Discard
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
