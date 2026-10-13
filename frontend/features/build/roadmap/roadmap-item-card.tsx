"use client";

import { memo, useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowBigUp, Pencil, ArrowRight, Globe, ArrowUp, ArrowDown, EyeOff } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listItem, listItemReduced, pmSnappy } from "@/lib/motion-presets";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type {
  RoadmapOwner,
  RoadmapPrioritization,
  RoadmapTierWeighting,
  RoadmapGoal,
  RoadmapRelease,
  RoadmapTeam,
  RoadmapOpportunity,
  RoadmapDelivery,
} from "@/hooks/api/build/roadmap-schema";
import { getUserDisplayName } from "@/lib/person-display";
import { RoadmapPriorityScore } from "./roadmap-priority-score";
import type { RoadmapHorizon, RoadmapStatus } from "@/types/projects";
import { ROADMAP_HORIZON_LABEL, ROADMAP_STATUS_BADGE_VARIANT, ROADMAP_STATUS_LABEL } from "./roadmap-constants";

export type ScorableRoadmapItem = {
  id: number;
  title: string;
  description?: string | null;
  outcome?: string | null;
  status: RoadmapStatus | string;
  category?: string | null;
  isPublic: boolean;
  projectId?: number | null;
  epicTicketId?: number | null;
  targetQuarter?: string | null;
  sortOrder: number;
  votes: number;
  horizon: RoadmapHorizon;
  goalId?: number | null;
  releaseId?: number | null;
  teamId?: number | null;
  opportunityId?: number | null;
  targetStart?: string | null;
  targetEnd?: string | null;
  decisionSnapshot?: Record<string, unknown> | null;
  reach?: number | null;
  impact?: number | null;
  confidence?: number | null;
  effort?: number | null;
  ownerMembershipId?: number | null;
  owner?: RoadmapOwner | null;
  prioritization?: RoadmapPrioritization;
  tierWeighting?: RoadmapTierWeighting;
  goal?: RoadmapGoal | null;
  release?: RoadmapRelease | null;
  team?: RoadmapTeam | null;
  opportunity?: RoadmapOpportunity | null;
  delivery?: RoadmapDelivery;
  allowedActions: string[];
  sourceFreshness: string | null;
  version: number;
};

interface RoadmapItemCardProps {
  item: ScorableRoadmapItem;
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
  onView?: (item: ScorableRoadmapItem) => void;
  onMove?: (item: ScorableRoadmapItem, horizon: RoadmapHorizon) => void;
  onMoveUp?: (item: ScorableRoadmapItem) => void;
  onMoveDown?: (item: ScorableRoadmapItem) => void;
  onPublishToggle?: (item: ScorableRoadmapItem) => void;
}

export const RoadmapItemCard = memo(function RoadmapItemCard({
  item,
  onEdit,
  onDelete,
  onView,
  onMove,
  onMoveUp,
  onMoveDown,
  onPublishToggle,
}: RoadmapItemCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = item.allowedActions.includes("edit");
  const canDelete = item.allowedActions.includes("delete");
  const canMove = item.allowedActions.includes("move");
  const canReorder = item.allowedActions.includes("reorder");
  const hasActions = canEdit || canDelete;

  const handleEdit = useCallback(() => { onEdit(item); }, [item, onEdit]);
  const handleDelete = useCallback(() => { onDelete(item); }, [item, onDelete]);
  const handleView = useCallback(() => { onView?.(item); }, [item, onView]);
  const handleMoveUp = useCallback(() => { onMoveUp?.(item); }, [item, onMoveUp]);
  const handleMoveDown = useCallback(() => { onMoveDown?.(item); }, [item, onMoveDown]);
  const handlePublishToggle = useCallback(() => { onPublishToggle?.(item); }, [item, onPublishToggle]);

  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => { if (!hasActions) return; event.preventDefault(); setMenuOpen(true); }, [hasActions]);

  const handleMoveNow = useCallback(() => { onMove?.(item, "now"); }, [item, onMove]);
  const handleMoveNext = useCallback(() => { onMove?.(item, "next"); }, [item, onMove]);
  const handleMoveLater = useCallback(() => { onMove?.(item, "later"); }, [item, onMove]);

  const deliveryLabel = item.delivery
    ? item.delivery.source === "none"
      ? "No linked work"
      : item.delivery.percent !== null
        ? `${item.delivery.percent}% done`
        : `${item.delivery.done}/${item.delivery.total}`
    : null;

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      className={cn(
        "group rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-within:border-primary/50",
      )}
      onContextMenu={handleContextMenu}
    >
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge
            variant={ROADMAP_STATUS_BADGE_VARIANT[String(item.status)] ?? "outline"}
            className="text-micro"
          >
            {ROADMAP_STATUS_LABEL[String(item.status)] ?? String(item.status)}
          </Badge>
          {item.horizon ? (
            <Badge variant="outline" className="text-micro">
              {ROADMAP_HORIZON_LABEL[item.horizon]}
            </Badge>
          ) : null}
          {item.isPublic ? (
            <span className="inline-flex items-center gap-1 text-micro text-muted-foreground">
              <Globe className="size-3" aria-hidden />
              Public
            </span>
          ) : (
            <Badge variant="outline" className="text-micro">
              Private
            </Badge>
          )}
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-dense tabular-nums text-muted-foreground">
            <ArrowBigUp className="size-3.5" aria-hidden />
            {item.votes}
          </span>
        </div>

        <div className="flex min-w-0 items-start justify-between gap-2">
          {onView ? (
            <button type="button" onClick={handleView} className="min-w-0 flex-1 text-left">
              <TruncatedText text={item.title} lines={2} className="text-sm font-semibold leading-snug text-foreground hover:text-primary" />
            </button>
          ) : (
            <TruncatedText text={item.title} lines={2} className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground" />
          )}
          {hasActions ? (
            <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {canEdit ? (
                <Button size="icon-sm" variant="ghost" aria-label="Edit roadmap item" onClick={handleEdit}>
                  <Pencil className="size-3.5" aria-hidden />
                </Button>
              ) : null}
              {canDelete ? (
                <AnimatedIconButton size="icon-sm" variant="ghost" className="text-destructive hover:text-destructive" aria-label="Delete roadmap item" onClick={handleDelete} icon={Trash2Icon} iconSize={14} />
              ) : null}
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <span aria-hidden tabIndex={-1} className="sr-only" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView ? <DropdownMenuItem onSelect={handleView}>View details</DropdownMenuItem> : null}
                  {canEdit ? <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem> : null}
                  {canReorder && onMoveUp ? <DropdownMenuItem onSelect={handleMoveUp}><ArrowUp className="size-3.5" />Move up</DropdownMenuItem> : null}
                  {canReorder && onMoveDown ? <DropdownMenuItem onSelect={handleMoveDown}><ArrowDown className="size-3.5" />Move down</DropdownMenuItem> : null}
                  {canMove && onMove ? (
                    <>
                      <DropdownMenuSeparator />
                      {item.horizon !== "now" ? <DropdownMenuItem onSelect={handleMoveNow}><ArrowRight className="size-3.5" />Move to Now</DropdownMenuItem> : null}
                      {item.horizon !== "next" ? <DropdownMenuItem onSelect={handleMoveNext}><ArrowRight className="size-3.5" />Move to Next</DropdownMenuItem> : null}
                      {item.horizon !== "later" ? <DropdownMenuItem onSelect={handleMoveLater}><ArrowRight className="size-3.5" />Move to Later</DropdownMenuItem> : null}
                    </>
                  ) : null}
                  {onPublishToggle ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handlePublishToggle}><EyeOff className="size-3.5" />{item.isPublic ? "Unpublish" : "Publish"}</DropdownMenuItem>
                    </>
                  ) : null}
                  {canDelete ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={handleDelete}>Delete</DropdownMenuItem></> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>

        {item.description ? (
          <p className={cn(TEXT_TWO_LINES, "text-dense leading-relaxed text-muted-foreground")} title={item.description}>
            {item.description}
          </p>
        ) : null}
        {item.outcome ? (
          <div
            className="rounded-md bg-muted/60 px-2 py-1.5"
            data-testid="roadmap-item-outcome"
            title={item.outcome}
          >
            <p className="text-micro font-medium text-muted-foreground">Outcome</p>
            <p className={cn(TEXT_TWO_LINES, "text-dense leading-snug text-foreground")}>{item.outcome}</p>
          </div>
        ) : null}

        {item.owner || item.goal || item.team || item.opportunity ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-dense text-muted-foreground">
            {item.owner ? <span className={TEXT_ONE_LINE}>Owner · {getUserDisplayName(item.owner)}</span> : null}
            {item.team ? <span className={TEXT_ONE_LINE}>Team · {item.team.name}</span> : null}
            {item.goal ? <span className={TEXT_ONE_LINE}>Goal · {item.goal.title}</span> : null}
            {item.opportunity ? (
              <Link href={`?opportunity=${item.opportunity.id}`} className={cn(TEXT_ONE_LINE, "text-primary underline-offset-2 hover:underline")}>
                Opportunity · {item.opportunity.title}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
          <RoadmapPriorityScore
            prioritization={item.prioritization}
            tierWeighting={item.tierWeighting}
          />
          {item.release ? (
            <Badge variant="secondary" className={cn(TEXT_ONE_LINE, "max-w-[8rem] text-micro")}>
              {item.release.name}
            </Badge>
          ) : null}
          {item.targetQuarter ? (
            <Badge variant="outline" className="text-micro">
              {item.targetQuarter}
            </Badge>
          ) : null}
          {item.category ? (
            <Badge variant="secondary" className={cn(TEXT_ONE_LINE, "max-w-[8rem] text-micro")}>
              {item.category}
            </Badge>
          ) : null}
          {deliveryLabel ? (
            <span className="text-dense text-muted-foreground">{deliveryLabel}</span>
          ) : null}
          {item.epicTicketId != null && item.projectId != null ? (
            <Link href={`/build/${item.projectId}/issues?ticket=${item.epicTicketId}`} aria-label="View epic ticket" className="text-dense text-primary underline-offset-2 hover:underline">Epic</Link>
          ) : null}
          {item.projectId !== null ? (
            <Link
              href={`/build/${item.projectId}`}
              aria-label="View project"
              className="text-dense text-primary underline-offset-2 hover:underline"
            >
              View project
            </Link>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
});
