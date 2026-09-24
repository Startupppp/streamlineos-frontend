"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KbResearchBriefListItem, KbResearchBriefStatus } from "@/types/kb";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<KbResearchBriefStatus, StatusConfig> = {
  queued: { label: "Queued", className: "bg-muted text-muted-foreground border-border" },
  running: { label: "Running", className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Completed", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  failed: { label: "Failed", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
};

interface KbResearchBriefCardProps {
  brief: KbResearchBriefListItem;
  basePath: string;
}

export function KbResearchBriefCard({ brief, basePath }: KbResearchBriefCardProps) {
  const router = useRouter();
  const statusConfig = STATUS_MAP[brief.status];

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(brief.createdAt), "MMM d, yyyy");
    } catch {
      return "—";
    }
  }, [brief.createdAt]);

  function handleClick() {
    router.push(`${basePath}/${brief.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <Card
      className={cn(
        "cursor-pointer border-border hover:border-primary/30 hover:bg-muted/20 transition-colors",
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open research brief: ${brief.topic}`}
    >
      <CardContent className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-label font-medium leading-snug truncate">{brief.topic}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("text-micro h-5", statusConfig.className)}
            >
              {brief.status === "running" && (
                <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
              )}
              {statusConfig.label}
            </Badge>
            {brief.sourceCount > 0 && (
              <span className="text-dense text-muted-foreground">
                {brief.sourceCount} source{brief.sourceCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <span className="text-dense text-muted-foreground shrink-0 pt-0.5">{formattedDate}</span>
      </CardContent>
    </Card>
  );
}
