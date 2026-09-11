"use client";

import { useCallback, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, Calendar, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatDealId, formatMoneyCompact } from "@/lib/format-utils";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import type { Deal } from "@/types/crm";
import { AIPredictDealButton } from "./ai-predict-deal-button";
import { useOrgDisplay } from "@/hooks/api/org-display";

function DealHealthBadge({ expectedCloseDate }: { expectedCloseDate: string | null }) {
  const status = useMemo(() => {
    if (!expectedCloseDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(expectedCloseDate);
    closeDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue" as const;
    if (diffDays < 7) return "due-soon" as const;
    return null;
  }, [expectedCloseDate]);

  if (!status) return null;
  if (status === "overdue") {
    return <Badge variant="destructive" className="text-micro px-1.5 py-0 h-4">Overdue</Badge>;
  }
  return <Badge className="text-micro px-1.5 py-0 h-4 bg-status-warning-fill hover:bg-status-warning-fill-hover text-white">Due soon</Badge>;
}

interface DealKanbanCardProps {
  deal: Deal;
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
  onOpen?: (id: number) => void;
}

function StageMenuItem({
  stageKey, dot, label, dealId, onStageChange,
}: {
  stageKey: string; dot: string; label: string; dealId: number;
  onStageChange: (id: number, stage: string) => void;
}) {
  const handleClick = useCallback(() => onStageChange(dealId, stageKey), [dealId, stageKey, onStageChange]);
  return (
    <DropdownMenuItem onClick={handleClick}>
      <div className={cn("w-2 h-2 rounded-full mr-2", dot)} />
      Move to {label}
    </DropdownMenuItem>
  );
}

export const DealKanbanCard = memo(function DealKanbanCard({ deal, onStageChange, onDelete, onOpen }: DealKanbanCardProps) {
  const money = useOrgDisplay();
  const router = useRouter();
  const { data: dealStages = [] } = useCrmStages("deal");
  const handleDelete = useCallback(() => onDelete(deal.id), [deal.id, onDelete]);
  const handleNavigate = useCallback(() => {
    if (onOpen) {
      onOpen(deal.id);
    } else {
      router.push(`/crm/deals/${deal.id}`);
    }
  }, [deal.id, onOpen, router]);

  return (
    <Card className="rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card border border-border" onClick={handleNavigate}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-1">
            <TruncatedText text={deal.name} className="text-sm font-medium" />
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-micro text-muted-foreground/70 select-all">{formatDealId(deal.id)}</span>
              <DealHealthBadge expectedCloseDate={deal.expectedCloseDate} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-0.5" aria-label="More options" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dealStages.filter(s => s.key !== deal.stage).map(s => {
                const { dotClass } = getCrmTokenClasses(s.color ?? "");
                return (
                  <StageMenuItem
                    key={s.key}
                    stageKey={s.key}
                    dot={dotClass}
                    label={s.label}
                    dealId={deal.id}
                    onStageChange={onStageChange}
                  />
                );
              })}
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-lg font-bold text-primary mt-1">
          {formatMoneyCompact(deal.value, money)}
        </p>

        {deal.contactPerson && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 min-w-0">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.contactPerson}</span>
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          {deal.assignedTo ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={resolveImageUrl(deal.assignedTo.image)} />
                <AvatarFallback className="text-micro">
                  {deal.assignedTo.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">{deal.assignedTo.name}</span>
            </div>
          ) : <span />}

          {deal.expectedCloseDate && (
            <span className="text-micro text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        {deal.probability !== null && deal.probability !== undefined && deal.probability > 0 && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${deal.probability}%` }} />
            </div>
            <span className="text-micro text-muted-foreground">{deal.probability}% probability</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-border/30 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <AIPredictDealButton dealId={deal.id} compact />
        </div>
      </CardContent>
    </Card>
  );
});
