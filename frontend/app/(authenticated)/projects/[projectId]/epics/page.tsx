"use client";

import { use, useState, useCallback, useRef } from "react";
import type { MouseEvent, KeyboardEvent, ChangeEvent } from "react";
import {
  useProject,
  useUpdateTicket,
  useDeleteTicket,
  useCreateTicket,
} from "@/hooks/api/projects";
import { CreateEpicDialog } from "@/features/projects/epics/create-epic-dialog";
import { EditEpicDialog } from "@/features/projects/epics/edit-epic-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Wrench,
  Pencil,
  Trash2,
  Plus,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { getColorSafe, priorityColors } from "@/lib/theme-constants";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function EpicsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const { data: project, isLoading } = useProject(projectId);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();

  const tickets = project?.tickets || [];
  const epics = tickets.filter(t => t.type === "EPIC");
  const stories = tickets.filter(t => t.type === "STORY");
  const tasks = tickets.filter(t => t.type === "TASK");

  const handleDeleteEpic = useCallback((epicId: number) => {
    const children = stories.filter(s => s.epicId === epicId);
    const unlinkPromises = children.map(s =>
      updateTicket.mutateAsync({ ticketId: s.id, epicId: undefined })
    );
    Promise.all(unlinkPromises)
      .then(() => {
        deleteTicket.mutate(
          { ticketId: epicId },
          {
            onSuccess: () => toast.success("Epic deleted"),
            onError: (error) => toast.error(getErrorMessage(error)),
          }
        );
      })
      .catch(() => {
        toast.error("Failed to unlink stories from epic");
      });
  }, [stories, updateTicket, deleteTicket]);

  const handleLinkStory = useCallback((storyId: number, epicId: number) => {
    updateTicket.mutate({ ticketId: storyId, epicId });
  }, [updateTicket]);

  const handleCreateStory = useCallback((title: string, epicId: number) => {
    createTicket.mutate(
      { projectId, title, type: "STORY", epicId },
      {
        onSuccess: () => toast.success("Story created"),
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [createTicket, projectId]);

  if (isLoading) {
    return (
      <PageWrapper title="Epics">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Epics"
      subtitle={`${epics.length} epic${epics.length !== 1 ? "s" : ""} — ${stories.length} stories, ${tickets.filter(t => t.status === "DONE").length} completed`}
      actions={<CreateEpicDialog projectId={projectId} />}
    >
      <div className="space-y-4" aria-live="polite" aria-atomic="true">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Epics" value={epics.length} icon={Layers} color="violet" index={0} />
          <StatCard label="Stories" value={stories.length} icon={BookOpen} color="blue" index={1} />
          <StatCard label="Tasks" value={tasks.length} icon={Wrench} color="cyan" index={2} />
          <StatCard label="Completed" value={tickets.filter(t => t.status === "DONE").length} icon={CheckCircle2} color="green" index={3} />
        </div>

        <div className="space-y-3">
          {epics.length === 0 ? (
            <Card className="border-dashed rounded-lg">
              <CardContent className="flex flex-col items-center justify-center min-h-[320px] py-12">
                <EmptyTasksIllustration className="mb-4" />
                <h3 className="text-lg font-semibold mb-2">No epics yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first epic to organize related stories and tasks
                </p>
                <CreateEpicDialog projectId={projectId} />
              </CardContent>
            </Card>
          ) : (
            epics.map((epic) => (
              <EpicCard
                key={epic.id}
                epic={epic}
                stories={stories.filter(s => s.epicId === epic.id)}
                projectId={projectId}
                unlinkedStories={stories.filter(s => !s.epicId)}
                onDeleteEpic={handleDeleteEpic}
                onLinkStory={handleLinkStory}
                onCreateStory={handleCreateStory}
                isDeleting={deleteTicket.isPending}
              />
            ))
          )}
        </div>

        {stories.filter(s => !s.epicId).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Stories without Epic
            </h2>
            <Card className="rounded-lg border border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <div className="space-y-1.5">
                  {stories.filter(s => !s.epicId).map((story) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-2.5 bg-muted/40 rounded-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-sm truncate">{story.title}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{story.status}</Badge>
                      </div>
                      <Link href={`/projects/${projectId}?ticket=${story.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </PageWrapper>
  );
}

interface EpicCardProps {
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

interface LinkStoryItemProps {
  story: { id: number; title: string };
  onSelect: (id: number) => void;
}

function LinkStoryItem({ story, onSelect }: LinkStoryItemProps) {
  const handleClick = useCallback(() => onSelect(story.id), [onSelect, story.id]);
  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-2 text-sm rounded hover:bg-muted transition-colors truncate"
    >
      {story.title}
    </button>
  );
}

function EpicCard({ epic, stories, projectId, unlinkedStories, onDeleteEpic, onLinkStory, onCreateStory, isDeleting }: EpicCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const editTriggerRef = useRef<HTMLButtonElement>(null);

  const totalItems = stories.length;
  const completedItems = stories.filter(s => s.status === "DONE").length;
  const inProgressItems = stories.filter(s => s.status === "IN_PROGRESS" || s.status === "IN_REVIEW").length;
  const todoItems = totalItems - completedItems - inProgressItems;

  const totalPoints = stories.reduce((sum, s) => sum + (s.points || 0), 0);
  const completedPoints = stories.filter(s => s.status === "DONE").reduce((sum, s) => sum + (s.points || 0), 0);

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
                  <Layers className="h-4 w-4 text-violet-500 shrink-0" />
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
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
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
                  <div className="bg-violet-500 h-full transition-all" style={{ width: `${(inProgressItems / totalItems) * 100}%` }} />
                  <div className="bg-muted-foreground/20 h-full transition-all" style={{ width: `${(todoItems / totalItems) * 100}%` }} />
                </>
              )}
            </div>
            {totalItems > 0 && (
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Done ({completedItems})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-500 rounded-full" /> In Progress ({inProgressItems})</span>
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
                <div className="p-4 flex flex-col items-center">
                  <EmptyTasksIllustration className="mx-auto mb-3 h-28 w-28 opacity-90" />
                  <p className="text-xs text-muted-foreground text-center">No stories linked yet</p>
                </div>
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
                  className="h-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
}
