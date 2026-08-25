"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, XIcon, CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  duplicate: "outline",
};

const STATUS_LEFT_COLOR: Record<string, string> = {
  pending: "bg-status-warning-fill",
  accepted: "bg-status-success-fill",
  declined: "bg-status-danger-fill",
  duplicate: "bg-border",
};

const REQUEST_TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  task: "Task",
  question: "Question",
  other: "Other",
};

interface IntakeItem {
  id: number;
  title: string;
  description?: unknown;
  status: string;
  createdAt?: string | Date | null;
  submitterEmail?: string | null;
  submitterName?: string | null;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  requestType?: "bug" | "feature" | "task" | "question" | "other" | null;
  declineReason?: string | null;
}

interface IntakeItemCardProps {
  item: IntakeItem;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onDuplicate: (id: number) => void;
}

export const IntakeItemCard = memo(function IntakeItemCard({ item, onAccept, onDecline, onDuplicate }: IntakeItemCardProps) {
  const handleAccept = useCallback(() => onAccept(item.id), [item.id, onAccept]);
  const handleDecline = useCallback(() => onDecline(item.id), [item.id, onDecline]);
  const handleDuplicate = useCallback(() => onDuplicate(item.id), [item.id, onDuplicate]);

  const submitterDisplay = item.submitterName ?? item.submitterEmail ?? null;

  return (
    <div className={cn(PM_PANEL, "flex overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md")}>
      <div className={cn("w-1 shrink-0", STATUS_LEFT_COLOR[item.status] ?? "bg-border")} />
      <div className="min-w-0 flex-1 px-4 py-3">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <TruncatedText text={item.title} className="text-sm font-semibold" />
          <Badge
            variant={STATUS_BADGE_VARIANT[item.status] ?? "outline"}
            className="text-xs font-medium px-1.5 py-0.5 rounded-md"
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
          {item.requestType && (
            <Badge variant="outline" className="text-xs font-medium px-1.5 py-0.5 rounded-md">
              {REQUEST_TYPE_LABEL[item.requestType] ?? item.requestType}
            </Badge>
          )}
          {item.priority && (
            <PriorityBadge priority={item.priority} showLabel size="sm" />
          )}
        </div>
        {item.description != null ? (
          <p className={cn(TEXT_TWO_LINES, "text-sm text-muted-foreground")}>
            {typeof item.description === "string" ? item.description : JSON.stringify(item.description)}
          </p>
        ) : null}
        <p className={cn(TEXT_ONE_LINE, "mt-1 text-xs text-muted-foreground")}>
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
          {submitterDisplay ? ` · ${submitterDisplay}` : ""}
        </p>
        {item.declineReason && (
          <p className="text-xs text-destructive mt-1">Reason: {item.declineReason}</p>
        )}
      </div>
      {item.status === "pending" && (
        <div className="flex items-center gap-1 shrink-0 py-3 pr-3">
          <AnimatedIconButton
            icon={CheckIcon}
            iconSize={14}
            iconClassName="mr-1"
            size="sm"
            className="text-xs h-7"
            onClick={handleAccept}
          >
            Accept
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={XIcon}
            iconSize={14}
            iconClassName="mr-1"
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={handleDecline}
          >
            Decline
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={CopyIcon}
            iconSize={14}
            size="sm"
            variant="ghost"
            className="w-7"
            onClick={handleDuplicate}
            aria-label="Mark as duplicate"
          />
        </div>
      )}
    </div>
  );
});
