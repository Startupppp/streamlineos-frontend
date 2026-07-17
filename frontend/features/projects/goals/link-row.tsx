"use client";

import { Ticket as TicketIcon, FolderKanban } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GoalDetail } from "@/hooks/api/goals";
import { PM_ROW } from "@/features/projects/shared/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

interface LinkRowProps {
  link: GoalDetail["links"][number];
  onRemove: (id: number) => void;
}

export function LinkRow({ link, onRemove }: LinkRowProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleRemove() {
    onRemove(link.id);
  }

  const label = link.ticketId
    ? (link.ticketTitle ?? `Ticket #${link.ticketId}`)
    : (link.projectName ?? `Project #${link.projectId}`);

  return (
    <div className={cn(PM_ROW, "rounded-lg border border-border/50 last:border-b")}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {link.ticketId ? (
          <TicketIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <TruncatedText text={label} className="text-sm" />
        {link.ticketId && link.projectKey ? (
          <Badge variant="outline" className="shrink-0 text-[9px]">
            {link.projectKey}
          </Badge>
        ) : null}
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Remove link"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        {...hoverHandlers}
      >
        <XIcon ref={iconRef} size={14} />
      </Button>
    </div>
  );
}
