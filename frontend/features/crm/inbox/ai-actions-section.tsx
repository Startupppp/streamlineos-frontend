"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ZapIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CrmAiAction } from "@/types/crm";

interface AiActionsSectionProps {
  actions: CrmAiAction[];
  onDismiss?: (action: CrmAiAction) => void;
}

export function AiActionsSection({ actions }: AiActionsSectionProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  if (actions.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-2.5 w-full px-3 py-2"
        {...hoverHandlers}
      >
        <ZapIcon ref={iconRef} size={14} />
        <span className="text-xs font-medium flex-1">AI Recommendations</span>
        <Badge className="h-4 min-w-[1.25rem] px-1 text-micro bg-primary/10 text-foreground border-0">
          {actions.length}
        </Badge>
      </div>
      <div className="border-t border-border/50">
        {actions.map((action, idx) => (
          <div
            key={`${action.entityType}-${action.entityId}-${idx}`}
            className="flex items-center gap-2 px-3 h-8 hover:bg-muted/20 transition-colors border-b border-border/30 last:border-b-0"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <Link
              href={action.href}
              className="text-xs font-medium text-foreground flex-1 hover:text-primary transition-colors"
            >
              <TruncatedText text={action.title} />
            </Link>
            <span className="text-dense text-muted-foreground shrink-0 max-w-[140px] truncate">
              {action.reason}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
