"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { MouseEvent, KeyboardEvent } from "react";
import {
  Layers,
  Pencil,
  Trash2,
} from "lucide-react";
import { EllipsisIcon, ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditEpicDialog } from "./edit-epic-dialog";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getColorSafe, priorityColors } from "@/lib/theme-constants";
import type { ProjectStatusRecord, Ticket } from "@/types/projects";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { format, parseISO, isValid } from "date-fns";
import { computeEpicRollup, formatStatusName } from "./epic-card-model";
import { EpicProgressBar, EpicStoriesPanel } from "./epic-card-parts";

export interface EpicCardProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    status: string | null;
    priority?: string | null;
    points?: number | null;
    version: number;
    assigneeMembershipId?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    assignee?: {
      id: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  };
  stories: Ticket[];
  dependencyCount?: number;
  projectId: number;
  projectKey?: string | null;
  projectStatuses?: ProjectStatusRecord[];
  unlinkedStories: Array<{ id: number; title: string }>;
  onDeleteEpic: (epicId: number) => void;
  onLinkStory: (storyId: number, epicId: number) => void;
  onCreateStory: (title: string, epicId: number) => void;
  isDeleting?: boolean;
}

export const EpicCard = memo(function EpicCard({ epic, stories, dependencyCount, projectId, projectKey, projectStatuses, unlinkedStories, onDeleteEpic, onLinkStory, onCreateStory, isDeleting }: EpicCardProps) {
  const canCreate = useCan("build:tickets:create");
  const canUpdate = useCan("build:tickets:update");
  const canDelete = useCan("build:tickets:delete");
  const canDeleteEpic = canDelete && (stories.length === 0 || canUpdate);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { iconRef: actionsIconRef, hoverHandlers: actionsHoverHandlers } = useAnimatedIcon();
  const { iconRef: expandIconRef, hoverHandlers: expandHoverHandlers } = useAnimatedIcon();

  const { totalItems, completedItems, inProgressItems, todoItems, totalPoints, completedPoints } = useMemo(
    () => computeEpicRollup(stories, projectStatuses),
    [stories, projectStatuses],
  );

  const epicCardId = `epic-stories-${epic.id}`;

  const handleToggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!canUpdate && !canDeleteEpic) return;
    e.preventDefault();
    setActionsOpen(true);
  }, [canDeleteEpic, canUpdate]);

  const handleStopPropagation = useCallback((e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleDelete = useCallback(() => onDeleteEpic(epic.id), [onDeleteEpic, epic.id]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded(prev => !prev);
    }
  }, []);

  const handleEditMenuSelect = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleDeleteMenuSelect = useCallback(() => {
    setShowDeleteAlert(true);
  }, []);

  const handleDeleteAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setShowDeleteAlert(false);
  }, []);

  return (
    <>
      <Card className={cn(PM_PANEL, "overflow-hidden shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/35 hover:shadow-md")}>
        <CardHeader
          className="cursor-pointer px-3 py-2.5 transition-colors hover:bg-primary/[0.03]"
          onClick={handleToggleExpand}
          onContextMenu={handleContextMenu}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={epicCardId}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-label={isExpanded ? "Collapse epic" : "Expand epic"}
                {...expandHoverHandlers}
              >
                {isExpanded ? <ChevronDownIcon ref={expandIconRef} size={14} /> : <ChevronRightIcon ref={expandIconRef} size={14} />}
              </Button>
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="flex min-w-0 items-center gap-1.5 text-label font-medium">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <TruncatedText text={epic.title} />
                </CardTitle>
                {epic.description ? (
                  <p className={cn(TEXT_TWO_LINES, "text-dense text-muted-foreground")} title={epic.description}>
                    {epic.description}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              className="ml-1 flex shrink-0 items-center gap-1"
              onClick={handleStopPropagation}
              onKeyDown={handleStopPropagation}
            >
              <Badge variant="secondary" className="h-5 px-1.5 text-micro">
                {formatStatusName(epic.status ?? "TODO")}
              </Badge>
              <Badge
                variant="outline"
                className={cn("h-5 px-1.5 text-micro", getColorSafe(priorityColors, epic.priority || "MEDIUM"))}
              >
                {formatStatusName(epic.priority || "MEDIUM")}
              </Badge>
              {canUpdate && (
                <EditEpicDialog
                  epic={epic}
                  projectId={projectId}
                  open={editOpen}
                  onOpenChange={setEditOpen}
                />
              )}
              {(canUpdate || canDeleteEpic) && (
                <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="More actions" {...actionsHoverHandlers}>
                      <EllipsisIcon ref={actionsIconRef} size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdate && (
                      <DropdownMenuItem onSelect={handleEditMenuSelect}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                    )}
                    {canDeleteEpic && (
                      <DropdownMenuItem variant="destructive" onSelect={handleDeleteMenuSelect}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="ml-7 mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-micro text-muted-foreground">
            {epic.assignee ? (
              <span className="flex items-center gap-1 min-w-0">
                <Avatar className="h-4 w-4 shrink-0">
                  <AvatarImage src={resolveImageUrl(epic.assignee.image)} />
                  <AvatarFallback className="text-micro">{getUserInitials(epic.assignee)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate">{getUserDisplayName(epic.assignee)}</span>
              </span>
            ) : null}
            {dependencyCount !== undefined && dependencyCount > 0 ? (
              <span className="shrink-0 tabular-nums">
                {dependencyCount === 1
                  ? "1 dependency"
                  : `${dependencyCount} dependencies`}
              </span>
            ) : null}
            {(epic.startDate || epic.dueDate) ? (
              <span className="shrink-0 tabular-nums">
                {epic.startDate && isValid(parseISO(epic.startDate)) ? format(parseISO(epic.startDate), "MMM d") : null}
                {epic.startDate && epic.dueDate && isValid(parseISO(epic.startDate)) && isValid(parseISO(epic.dueDate)) ? " → " : null}
                {epic.dueDate && isValid(parseISO(epic.dueDate)) ? format(parseISO(epic.dueDate), "MMM d, yyyy") : null}
              </span>
            ) : null}
          </div>

          <EpicProgressBar
            completedItems={completedItems}
            inProgressItems={inProgressItems}
            todoItems={todoItems}
            totalItems={totalItems}
            completedPoints={completedPoints}
            totalPoints={totalPoints}
          />
        </CardHeader>

        {isExpanded ? (
          <EpicStoriesPanel
            epicId={epic.id}
            epicTitle={epic.title}
            epicCardId={epicCardId}
            stories={stories}
            projectId={projectId}
            projectKey={projectKey}
            projectStatuses={projectStatuses}
            canCreate={canCreate}
            canUpdate={canUpdate}
            unlinkedStories={unlinkedStories}
            onCreateStory={onCreateStory}
            onLinkStory={onLinkStory}
          />
        ) : null}
      </Card>

      {canDeleteEpic && (
        <ConfirmDialog
          open={showDeleteAlert}
          onOpenChange={handleDeleteAlertOpenChange}
          title="Delete epic?"
          description="Child stories will be unlinked. This action cannot be undone."
          confirmLabel="Delete"
          destructive
          isPending={isDeleting}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
});
