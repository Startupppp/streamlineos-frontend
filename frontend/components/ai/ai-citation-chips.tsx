"use client";

import * as React from "react";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";

export interface Citation {
  id: string | number;
  title: string;
  href?: string;
  snippet?: string;
  freshness?: string | Date;
}

interface AiCitationChipsProps {
  citations: Citation[];
  className?: string;
}

function freshnessLabel(value: string | Date | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (!isValid(date)) return null;
  return format(date, "MMM d, yyyy");
}

interface ChipInnerProps {
  index: number;
  citation: Citation;
}

function CitationChipInner({ index, citation }: ChipInnerProps) {
  const freshness = freshnessLabel(citation.freshness);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex max-w-[140px] cursor-default items-center gap-1 truncate rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors",
              citation.href && "cursor-pointer hover:border-primary/40 hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="shrink-0 font-semibold text-primary/70">[{index + 1}]</span>
            <TruncatedText text={citation.title ?? ""} />
          </span>
        </TooltipTrigger>
        {(citation.snippet || freshness) && (
          <TooltipContent side="top" className="max-w-[260px] space-y-1 p-2 text-left">
            {citation.snippet && (
              <p className="text-[11px] leading-snug text-popover-foreground">
                {citation.snippet}
              </p>
            )}
            {freshness && (
              <p className="text-[10px] text-muted-foreground">{freshness}</p>
            )}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export function AiCitationChips({ citations, className }: AiCitationChipsProps) {
  if (citations.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {citations.map((citation, index) =>
        citation.href ? (
          <Link key={citation.id} href={citation.href} target="_blank" rel="noopener noreferrer">
            <CitationChipInner index={index} citation={citation} />
          </Link>
        ) : (
          <CitationChipInner key={citation.id} index={index} citation={citation} />
        ),
      )}
    </div>
  );
}
