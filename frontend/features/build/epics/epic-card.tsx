"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { MouseEvent, KeyboardEvent, ChangeEvent } from "react";
import {
  Layers,
  Pencil,
  Trash2,
  Link2,
} from "lucide-react";
import { EllipsisIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditEpicDialog } from "./edit-epic-dialog";
import { EpicStoryRow } from "./epic-story-row";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getColorSafe, priorityColors } from "@/lib/theme-constants";
import type { ProjectStatusRecord, Ticket } from "@/types/projects";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";

export interface EpicCardProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    status: string | null;
    priority?: string | null;
    points?: number | null;
  };
  stories: Ticket[];
  projectId: number;
  projectKey?: string | null;
  projectStatuses?: ProjectStatusRecord[];
  unlinkedStories: Array<{ id: number; title: string }>;
  onDeleteEpic: (epicId: number) => void;
  onLinkStory: (storyId: number, epicId: number) => void;
  onCreateStory: (title: string, epicId: number) => void;
  isDeleting?: boolean;
}

export interface LinkStoryItemProps {
  story: { id: number; title: string };
  onSelect: (id: number) => void;
}

export const LinkStoryItem = memo(function LinkStoryItem({ story, onSelect }: LinkStoryItemProps) {
  const handleClick = useCallback(() => onSelect(story.id), [onSelect, story.id]);
  return (
    <button
      onClick={handleClick}
      className="w-full min-w-0 rounded-md p-2 text-left text-xs transition-colors hover:bg-primary/[0.06]"
    >
      <TruncatedText text={story.title} />
    </button>
  );
});

export const EpicCard = memo(function EpicCard({ epic, stories, projectId, projectKey, projectStatuses, unlinkedStories, onDeleteEpic, onLinkStory, onCreateStory, isDeleting }: EpicCardProps) {
  const canCreate = useCan("build:tickets:create");
  const canUpdate = useCan("build:tickets:update");
  const canDelete = useCan("build:tickets:delete");
  const canDeleteEpic = canDelete && (stories.length === 0 || canUpdate);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { iconRef: actionsIconRef, hoverHandlers: actionsHoverHandlers } = useAnimatedIcon();
  const { iconRef: expandIconRef, hoverHandlers: expandHoverHandlers } = useAnimatedIcon();
  const { iconRef: addIconRef, hoverHandlers: addHoverHandlers } = useAnimatedIcon();

  const { totalItems, completedItems, inProgressItems, todoItems, totalPoints, completedPoints } = useMemo(() => {
    let done = 0, inProgress = 0, totalPts = 0, completedPts = 0;
    for (const s of stories) {
      const pts = s.points || 0;
      totalPts += pts;
      if (s.status === "DONE") { done++; completedPts += pts; }
      else if (s.status === "IN_PROGRESS" || s.status === "IN_REVIEW") inProgress++;
    }
    return {
      totalItems: stories.length,
      completedItems: done,
      inProgressItems: inProgress,
      todoItems: stories.length - done - inProgress,
      totalPoints: totalPts,
      completedPoints: completedPts,
    };
  }, [stories]);

  const epicCardId = `epic-stories-${epic.id}`;

  const handleToggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);

  const handleStopPropagation = useCallback((e: MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  const handleDelete = useCallback(() => onDeleteEpic(epic.id), [onDeleteEpic, epic.id]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded(prev => !prev);
    }
  }, []);

  const handleEpicLinkStory = useCallback((storyId: number) => {
    onLinkStory(storyId, epic.id);
  }, [onLinkStory, epic.id]);

  const handleEpicCreateStory = useCallback((title: string) => {
    onCreateStory(title, epic.id);
  }, [onCreateStory, epic.id]);

  const handleSelectLink = useCallback((storyId: number) => {
    handleEpicLinkStory(storyId);
    setLinkOpen(false);
  }, [handleEpicLinkStory]);

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewStoryTitle(e.target.value);
  }, []);

  const handleTitleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newStoryTitle.trim()) {
      handleEpicCreateStory(newStoryTitle.trim());
      setNewStoryTitle("");
    }
  }, [newStoryTitle, handleEpicCreateStory]);

  const handleAddStory = useCallback(() => {
    if (newStoryTitle.trim()) {
      handleEpicCreateStory(newStoryTitle.trim());
      setNewStoryTitle("");
    }
  }, [newStoryTitle, handleEpicCreateStory]);

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
                <CardTitle className="flex min-w-0 items-center gap-1.5 text-label font-semibold">
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
              <Badge
                variant="outline"
                className={cn("h-5 px-1.5 text-micro", getColorSafe(priorityColors, epic.priority || "MEDIUM"))}
              >
                {epic.priority || "MEDIUM"}
              </Badge>
              {canUpdate && (
                <EditEpicDialog
                  epic={epic}
                  projectId={projectId}
                  open={editOpen}
                  onOpenChange={setEditOpen}
                />
              )}
              {(canUpdate || canDeleteEpic) && <DropdownMenu>
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
              </DropdownMenu>}
            </div>
          </div>

          <div className="ml-7 mt-2 space-y-1">
            <div className="flex items-center justify-between gap-2 text-micro tabular-nums text-muted-foreground">
              <span className="min-w-0 truncate">
                {completedItems} of {totalItems} stories
              </span>
              <span className="shrink-0">
                {completedPoints} / {totalPoints} pts
              </span>
            </div>
            <div
              className="flex h-1 w-full overflow-hidden rounded-full bg-muted/80"
              role="progressbar"
              aria-valuenow={totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Epic progress: ${completedItems} of ${totalItems} stories completed`}
              aria-valuetext={`${totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}% complete`}
            >
              {totalItems > 0 ? (
                <>
                  <div
                    className="h-full bg-status-success-fill transition-[width] duration-300"
                    style={{ width: `${(completedItems / totalItems) * 100}%` }}
                  />
                  <div
                    className="h-full bg-primary/70 transition-[width] duration-300"
                    style={{ width: `${(inProgressItems / totalItems) * 100}%` }}
                  />
                  <div
                    className="h-full bg-muted-foreground/20 transition-[width] duration-300"
                    style={{ width: `${(todoItems / totalItems) * 100}%` }}
                  />
                </>
              ) : null}
            </div>
            {totalItems > 0 ? (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-micro text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-success-fill" /> Done ({completedItems})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70" /> In Progress ({inProgressItems})
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" /> To Do ({todoItems})
                </span>
              </div>
            ) : null}
          </div>
        </CardHeader>

        {isExpanded ? (
          <CardContent
            className="border-t border-border/50 px-3 pb-2.5 pt-2"
            id={epicCardId}
            role="region"
            aria-label={`Stories for ${epic.title}`}
          >
            <div className="ml-6 space-y-1 border-l border-border/60 pl-2.5">
              {stories.map((story) => (
                <EpicStoryRow
                  key={story.id}
                  story={story}
                  projectId={projectId}
                  projectKey={projectKey}
                  projectStatuses={projectStatuses}
                />
              ))}

              {stories.length === 0 ? (
                <EmptyState compact title="No stories linked yet" className="border-0 bg-transparent py-2.5" />
              ) : null}

              {(canCreate || canUpdate) && <div className="flex min-w-0 flex-wrap gap-1.5 pt-1">
                {canCreate && (
                  <>
                <Input
                  value={newStoryTitle}
                  onChange={handleTitleChange}
                  placeholder="New story title..."
                  aria-label={`Add new story to ${epic.title}`}
                  className="min-w-0 flex-1 border-border/70 bg-background/60 text-xs backdrop-blur-sm"
                  onKeyDown={handleTitleKeyDown}
                />
                <Button size="sm" className="px-2.5 text-xs" onClick={handleAddStory} disabled={!newStoryTitle.trim()} {...addHoverHandlers}>
                  <PlusIcon ref={addIconRef} size={14} className="mr-1" />
                  Add
                </Button>
                  </>
                )}
                {canUpdate && unlinkedStories.length > 0 ? (
                  <ResponsivePopover open={linkOpen} onOpenChange={setLinkOpen}>
                    <ResponsivePopoverTrigger asChild>
                      <Button variant="outline" size="sm" className=" border-border/70 bg-background/60 px-2.5 text-xs backdrop-blur-sm">
                        <Link2 className="mr-1 h-3.5 w-3.5" />
                        Link
                      </Button>
                    </ResponsivePopoverTrigger>
                    <ResponsivePopoverContent title="Link story" className="w-72 p-1.5" align="end">
                      <div className="max-h-48 space-y-0.5 overflow-y-auto">
                        {unlinkedStories.map((s) => (
                          <LinkStoryItem key={s.id} story={s} onSelect={handleSelectLink} />
                        ))}
                      </div>
                    </ResponsivePopoverContent>
                  </ResponsivePopover>
                ) : null}
              </div>}
            </div>
          </CardContent>
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
