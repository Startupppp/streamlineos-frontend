"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUpIcon, ThumbsDownIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiCitationChips, AiPermissionDenied } from "@/components/ai";
import { useWorkspaceAskFeedback, type WorkspaceAskResponse } from "@/hooks/api/workspace-search";
import { toast } from "sonner";

interface WorkspaceAskPanelProps {
  data: WorkspaceAskResponse | undefined;
  isPending: boolean;
  error: Error | null;
  className?: string;
}

export function WorkspaceAskPanel({ data, isPending, error, className }: WorkspaceAskPanelProps) {
  const feedback = useWorkspaceAskFeedback();

  function handleFeedback(rating: "up" | "down") {
    feedback.mutate(
      { feature: "workspace.ask", rating },
      {
        onSuccess: () => toast.success(rating === "up" ? "Thanks for the feedback!" : "Got it, we'll improve."),
      },
    );
  }

  if (isPending) {
    return (
      <div className={cn("space-y-3 p-4 bg-card border border-border rounded-xl", className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 bg-card border border-border rounded-xl", className)}>
        <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.noPermittedSource) {
    return (
      <div className={cn("p-4 bg-card border border-border rounded-xl", className)}>
        <AiPermissionDenied reason="No accessible content matched your query." />
      </div>
    );
  }

  const citations = data.citations.map((c) => ({
    id: `${c.entityType}:${c.entityId}`,
    title: c.title,
    href: c.urlPath,
    snippet: c.snippet,
    freshness: c.freshness,
  }));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="ask-panel"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={cn("p-4 bg-card border border-border rounded-xl space-y-3", className)}
      >
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{data.answer}</p>
        {citations.length > 0 && (
          <AiCitationChips citations={citations} />
        )}
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <span className="text-[11px] text-muted-foreground">Was this helpful?</span>
          <AnimatedIconButton
            icon={ThumbsUpIcon}
            iconSize={12}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] gap-1"
            onClick={() => handleFeedback("up")}
            disabled={feedback.isPending}
          >
            Yes
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={ThumbsDownIcon}
            iconSize={12}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] gap-1"
            onClick={() => handleFeedback("down")}
            disabled={feedback.isPending}
          >
            No
          </AnimatedIconButton>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
