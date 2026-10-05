"use client";

import { memo, useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent } from "@/components/ui/card";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { EmptyState } from "@/components/ui/empty-state";
import { EpicStoryRow } from "./epic-story-row";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { ProjectStatusRecord, Ticket } from "@/types/projects";

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

export interface EpicProgressBarProps {
  completedItems: number;
  inProgressItems: number;
  todoItems: number;
  totalItems: number;
  completedPoints: number;
  totalPoints: number;
}

export function EpicProgressBar({
  completedItems,
  inProgressItems,
  todoItems,
  totalItems,
  completedPoints,
  totalPoints,
}: EpicProgressBarProps) {
  return (
    <div className="ml-7 mt-2 space-y-1">
      <div className="flex items-center justify-between gap-2 text-micro tabular-nums text-muted-foreground">
        <span className="min-w-0 truncate">
          {completedItems} of {totalItems} items
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
        aria-label={`Epic progress: ${completedItems} of ${totalItems} items completed`}
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
  );
}

export interface EpicStoriesPanelProps {
  epicId: number;
  epicTitle: string;
  epicCardId: string;
  stories: Ticket[];
  projectId: number;
  projectKey?: string | null;
  projectStatuses?: ProjectStatusRecord[];
  canCreate: boolean;
  canUpdate: boolean;
  unlinkedStories: Array<{ id: number; title: string }>;
  onCreateStory: (title: string, epicId: number) => void;
  onLinkStory: (storyId: number, epicId: number) => void;
}

export const EpicStoriesPanel = memo(function EpicStoriesPanel({
  epicId,
  epicTitle,
  epicCardId,
  stories,
  projectId,
  projectKey,
  projectStatuses,
  canCreate,
  canUpdate,
  unlinkedStories,
  onCreateStory,
  onLinkStory,
}: EpicStoriesPanelProps) {
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const { iconRef: addIconRef, hoverHandlers: addHoverHandlers } = useAnimatedIcon();

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewStoryTitle(e.target.value);
  }, []);

  const handleAddStory = useCallback(() => {
    if (newStoryTitle.trim()) {
      onCreateStory(newStoryTitle.trim(), epicId);
      setNewStoryTitle("");
    }
  }, [newStoryTitle, onCreateStory, epicId]);

  const handleTitleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newStoryTitle.trim()) {
      onCreateStory(newStoryTitle.trim(), epicId);
      setNewStoryTitle("");
    }
  }, [newStoryTitle, onCreateStory, epicId]);

  const handleSelectLink = useCallback((storyId: number) => {
    onLinkStory(storyId, epicId);
    setLinkOpen(false);
  }, [onLinkStory, epicId]);

  return (
    <CardContent
      className="border-t border-border/50 px-3 pb-2.5 pt-2"
      id={epicCardId}
      role="region"
      aria-label={`Stories for ${epicTitle}`}
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

        {(canCreate || canUpdate) && (
          <div className="flex min-w-0 flex-wrap gap-1.5 pt-1">
            {canCreate && (
              <>
                <Input
                  value={newStoryTitle}
                  onChange={handleTitleChange}
                  placeholder="New story title..."
                  aria-label={`Add new story to ${epicTitle}`}
                  className="min-w-0 flex-1 border-border/70 bg-background/60 text-xs backdrop-blur-sm"
                  onKeyDown={handleTitleKeyDown}
                />
                <Button
                  size="sm"
                  className="px-2.5 text-xs"
                  onClick={handleAddStory}
                  disabled={!newStoryTitle.trim()}
                  {...addHoverHandlers}
                >
                  <PlusIcon ref={addIconRef} size={14} className="mr-1" />
                  Add
                </Button>
              </>
            )}
            {canUpdate && unlinkedStories.length > 0 ? (
              <ResponsivePopover open={linkOpen} onOpenChange={setLinkOpen}>
                <ResponsivePopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/70 bg-background/60 px-2.5 text-xs backdrop-blur-sm">
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
          </div>
        )}
      </div>
    </CardContent>
  );
});
