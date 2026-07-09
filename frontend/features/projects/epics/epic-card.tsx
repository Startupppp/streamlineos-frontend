"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { MouseEvent, KeyboardEvent, ChangeEvent } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Pencil,
  Trash2,
  Plus,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditEpicDialog } from "./edit-epic-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getColorSafe, priorityColors } from "@/lib/theme-constants";
import Link from "next/link";

export interface EpicCardProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    status: string | null;
    priority?: string | null;
    points?: number | null;
  };
  stories: Array<{
    id: number;
    title: string;
    status: string | null;
    points?: number | null;
    epicId?: number | null;
  }>;
  projectId: number;
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
      className="w-full text-left p-2 text-sm rounded hover:bg-muted transition-colors truncate"
    >
      {story.title}
    </button>
  );
});

export const EpicCard = memo(function EpicCard({ epic, stories, projectId, unlinkedStories, onDeleteEpic, onLinkStory, onCreateStory, isDeleting }: EpicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const editTriggerRef = useRef<HTMLButtonElement>(null);

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

  const handleStopPropagation = useCallback((e: MouseEvent) => {
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
    editTriggerRef.current?.click();
  }, []);

  const handleDeleteMenuSelect = useCallback(() => {
    setShowDeleteAlert(true);
  }, []);

  const handleDeleteAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setShowDeleteAlert(false);
  }, []);

  return (
    <>
      <Card className="overflow-hidden rounded-lg border border-border bg-card">
        <CardHeader
          className="cursor-pointer hover:bg-muted/40 transition-colors py-3 px-4"
          onClick={handleToggleExpand}
          role="button"
          aria-expanded={isExpanded}
          aria-controls={epicCardId}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5 min-w-0">
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 mt-0.5" aria-label={isExpanded ? "Collapse epic" : "Expand epic"}>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
              <div className="space-y-0.5 min-w-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{epic.title}</span>
                </CardTitle>
                {epic.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{epic.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={handleStopPropagation}>
              <Badge variant="outline" className={cn("text-xs", getColorSafe(priorityColors, epic.priority || "MEDIUM"))}>
                {epic.priority || "MEDIUM"}
              </Badge>
              <EditEpicDialog epic={epic} projectId={projectId} trigger={
                <button ref={editTriggerRef} className="sr-only" aria-hidden tabIndex={-1}>Edit</button>
              } />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleEditMenuSelect}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive"
                    onSelect={handleDeleteMenuSelect}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="ml-7 mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completedItems} of {totalItems} stories</span>
              <span>{completedPoints} / {totalPoints} pts</span>
            </div>
            <div
              className="w-full h-1.5 bg-muted rounded-full flex overflow-hidden"
              role="progressbar"
              aria-valuenow={totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Epic progress: ${completedItems} of ${totalItems} stories completed`}
              aria-valuetext={`${totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}% complete`}
            >
              {totalItems > 0 && (
                <>
                  <div className="bg-green-500 h-full transition-all" style={{ width: `${(completedItems / totalItems) * 100}%` }} />
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${(inProgressItems / totalItems) * 100}%` }} />
                  <div className="bg-muted-foreground/20 h-full transition-all" style={{ width: `${(todoItems / totalItems) * 100}%` }} />
                </>
              )}
            </div>
            {totalItems > 0 && (
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Done ({completedItems})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> In Progress ({inProgressItems})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-muted-foreground/30 rounded-full" /> To Do ({todoItems})</span>
              </div>
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 pb-3 px-4" id={epicCardId} role="region" aria-label={`Stories for ${epic.title}`}>
            <div className="ml-7 space-y-1.5 border-l-2 border-muted pl-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center justify-between p-2.5 bg-muted/40 rounded-md hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="font-semibold text-sm truncate">{story.title}</span>
                    {story.points != null && story.points > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">{story.points} pts</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", story.status === "DONE" && "border-green-500 text-green-500")}
                    >
                      {story.status || "TODO"}
                    </Badge>
                    <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                    </Link>
                  </div>
                </div>
              ))}

              {stories.length === 0 && (
                <EmptyState compact title="No stories linked yet" className="py-3 border-0 bg-transparent" />
              )}

              <div className="flex gap-2 pt-1.5">
                <Input
                  value={newStoryTitle}
                  onChange={handleTitleChange}
                  placeholder="New story title..."
                  aria-label={`Add new story to ${epic.title}`}
                  className="h-8 text-sm flex-1"
                  onKeyDown={handleTitleKeyDown}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleAddStory}
                  disabled={!newStoryTitle.trim()}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
                {unlinkedStories.length > 0 && (
                  <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <Link2 className="h-3.5 w-3.5 mr-1" />
                        Link
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="end">
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {unlinkedStories.map((s) => (
                          <LinkStoryItem key={s.id} story={s} onSelect={handleSelectLink} />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={showDeleteAlert} onOpenChange={handleDeleteAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete epic?</AlertDialogTitle>
            <AlertDialogDescription>
              Child stories will be unlinked. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
