"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useProject,
  useAddComment,
  useSprints,
  useSubtasks,
  useCreateTicket,
  vaivammKeys,
} from "@/lib/hooks/trpc-hooks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer,
  Plus,
  ListChecks,
  Zap,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { viewFile, getSignedFileUrl } from "@/hooks/use-file-url";
import { LabelPicker } from "./label-picker";
import { Progress } from "@/components/ui/progress";

function AttachmentImage({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        const signedUrl = await getSignedFileUrl(fileUrl);
        if (mounted) setImageSrc(signedUrl);
      } catch {
        if (mounted) setImageSrc(fileUrl);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadImage();
    return () => { mounted = false; };
  }, [fileUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageSrc || fileUrl}
      alt={fileName}
      className="object-cover w-full h-full"
      onError={(e) => { if (e.target instanceof HTMLImageElement) e.target.style.display = 'none'; }}
    />
  );
}

interface TicketDetailsDialogProps {
  ticketId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  statuses?: Array<{ name: string; id: number }>;
}

const priorityConfig = {
  LOW: { label: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Circle },
  MEDIUM: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300", icon: Timer },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300", icon: AlertCircle },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", icon: AlertCircle },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  TODO: { label: "To Do", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  IN_REVIEW: { label: "In Review", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  DONE: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
};

export function TicketDetailsDialog({
  ticketId,
  open,
  onOpenChange,
  projectId,
  statuses,
}: TicketDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: ticket, isLoading } = useTicket(ticketId || 0);
  const { data: projectData } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);

  const members = (() => {
    if (!projectData?.members) return [];
    const list = projectData.members.map((m) => ({
      id: m.user.id,
      name: m.user.name || `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim(),
      firstName: m.user.firstName || undefined,
      lastName: m.user.lastName || undefined,
      image: m.user.image || null,
      email: m.user.email,
    }));
    const mgr = "manager" in projectData
      ? (projectData as { manager?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; image?: string | null; email?: string | null } }).manager
      : undefined;
    if (mgr && !list.some((m) => m.id === mgr.id)) {
      list.unshift({
        id: mgr.id,
        name: mgr.name || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
        firstName: mgr.firstName || undefined,
        lastName: mgr.lastName || undefined,
        image: mgr.image || null,
        email: mgr.email || "",
      });
    }
    return list;
  })();
  const { data: subtasks } = useSubtasks(ticketId || 0);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: vaivammKeys.project.project(projectId) });
    queryClient.invalidateQueries({ queryKey: vaivammKeys.project.ticket(ticketId!) });
  }, [queryClient, projectId, ticketId]);

  const updateTicketMutation = useUpdateTicket({
    onSuccess: () => {
      setSaving(false);
      invalidateAll();
    },
    onError: (error) => {
      setSaving(false);
      toast.error(error.message || "Failed to update ticket");
    },
  });

  const deleteTicketMutation = useDeleteTicket({
    onSuccess: () => {
      toast.success("Ticket deleted");
      invalidateAll();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Failed to delete ticket"),
  });

  const addCommentMutation = useAddComment({
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: vaivammKeys.project.ticket(ticketId!) });
    },
    onError: (error) => toast.error(error.message || "Failed to add comment"),
  });

  const createSubtask = useCreateTicket({
    onSuccess: () => {
      setSubtaskTitle("");
      queryClient.invalidateQueries({ queryKey: [...vaivammKeys.project.all, "subtasks", { parentTicketId: ticketId }] });
      invalidateAll();
    },
    onError: (error) => toast.error(error.message || "Failed to create subtask"),
  });
  const autoSave = useCallback((field: Record<string, unknown>) => {
    if (!ticketId) return;
    setSaving(true);
    updateTicketMutation.mutate({ ticketId, ...field });
  }, [ticketId, updateTicketMutation]);
  const debouncedSave = useCallback((field: Record<string, unknown>) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSaving(true);
    debounceTimerRef.current = setTimeout(() => {
      if (!ticketId) return;
      updateTicketMutation.mutate({ ticketId, ...field });
    }, 500);
  }, [ticketId, updateTicketMutation]);
  useEffect(() => {
    if (ticket) {
      setLocalTitle(ticket.title);
      setLocalDescription(ticket.description || "");
    }
  }, [ticket]);
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleAddComment = () => {
    if (!commentText.trim() || !ticketId) return;
    addCommentMutation.mutate({ ticketId, content: commentText.trim() });
  };

  const handleAddSubtask = () => {
    if (!subtaskTitle.trim() || !ticketId) return;
    createSubtask.mutate({
      projectId,
      title: subtaskTitle.trim(),
      type: "TASK",
      parentTicketId: ticketId,
    });
  };

  const handleToggleSubtask = (subtaskId: number, currentStatus: string | null) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    updateTicketMutation.mutate({ ticketId: subtaskId, status: newStatus });
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: [...vaivammKeys.project.all, "subtasks", { parentTicketId: ticketId }] });
    }, 300);
  };

  const currentPriority = (ticket?.priority as keyof typeof priorityConfig) || "MEDIUM";
  const currentStatus = ticket?.status || "TODO";
  const statusDisplay = statusConfig[currentStatus] || { label: currentStatus, color: "bg-slate-100 text-slate-700" };
  const subtaskList = subtasks || [];
  const subtasksDone = subtaskList.filter((s) => s.status === "DONE").length;
  const subtasksTotal = subtaskList.length;
  const subtaskProgress = subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;
  const timeSpent = ticket?.timeSpent ? parseFloat(ticket.timeSpent) : 0;
  const originalEstimate = ticket?.originalEstimate ? parseFloat(ticket.originalEstimate) : 0;
  const timeProgress = originalEstimate > 0 ? Math.min((timeSpent / originalEstimate) * 100, 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-1/2 sm:max-w-[50vw] overflow-hidden p-0"
      >
        
        <div className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent px-6 py-4">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    #{ticket?.ticketNumber ?? ticketId}
                  </Badge>
                  {ticket && (
                    <>
                      <Badge className={priorityConfig[currentPriority]?.color || priorityConfig.MEDIUM.color}>
                        {priorityConfig[currentPriority]?.label || "Medium"}
                      </Badge>
                      <Badge className={statusDisplay.color}>
                        {statusDisplay.label}
                      </Badge>
                      {saving && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Saving...
                        </span>
                      )}
                    </>
                  )}
                </div>
                <SheetTitle className="text-xl font-semibold leading-tight">
                  {isLoading ? "Loading..." : ticket?.title}
                </SheetTitle>
              </div>
              {ticket && (
                <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none text-destructive">Delete Ticket</h4>
                        <p className="text-sm text-muted-foreground">
                          This action cannot be undone.
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTicketMutation.mutate({ ticketId: ticketId! })}
                          disabled={deleteTicketMutation.isPending}
                        >
                          {deleteTicketMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </SheetHeader>
        </div>

        
        <div className="overflow-y-auto h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Loading ticket details...</p>
            </div>
          ) : ticket ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              
              <div className="lg:col-span-2 p-4 sm:p-6 space-y-6 border-r">
                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Title</label>
                  <Input
                    value={localTitle}
                    onChange={(e) => {
                      setLocalTitle(e.target.value);
                      debouncedSave({ title: e.target.value });
                    }}
                    className="text-base font-medium border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1"
                  />
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Description</label>
                  <Textarea
                    value={localDescription}
                    onChange={(e) => {
                      setLocalDescription(e.target.value);
                      debouncedSave({ description: e.target.value });
                    }}
                    className="min-h-[120px] border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1 resize-none"
                    placeholder="Add a detailed description..."
                  />
                </div>

                
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Subtasks</h4>
                    {subtasksTotal > 0 && (
                      <Badge variant="secondary" className="text-xs">{subtasksDone}/{subtasksTotal}</Badge>
                    )}
                  </div>
                  {subtasksTotal > 0 && (
                    <Progress value={subtaskProgress} className="h-1.5 mb-3" />
                  )}
                  <div className="space-y-1.5 mb-3">
                    {subtaskList.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={sub.status === "DONE"}
                          onCheckedChange={() => handleToggleSubtask(sub.id, sub.status)}
                        />
                        <span className={`text-sm flex-1 ${sub.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                          {sub.title}
                        </span>
                        {sub.assignee && (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={resolveImageUrl(sub.assignee.image)} />
                            <AvatarFallback className="text-[10px]">
                              {sub.assignee.firstName?.[0]}{sub.assignee.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      placeholder="Add subtask..."
                      className="h-8 text-sm flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
                    />
                    <Button size="sm" className="h-8" onClick={handleAddSubtask} disabled={!subtaskTitle.trim() || createSubtask.isPending}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Attachments</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ticket.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => viewFile(att.fileUrl)}
                          className="group relative aspect-video rounded-lg overflow-hidden bg-muted border hover:border-primary/50 transition-all hover:shadow-md text-left"
                        >
                          {att.mimeType && att.mimeType.startsWith('image/') ? (
                            <AttachmentImage fileUrl={att.fileUrl} fileName={att.fileName} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-2 text-center">
                              {att.fileName}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink className="h-5 w-5 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                
                <div className="pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Comments</h4>
                    <Badge variant="secondary" className="text-xs">{ticket.comments?.length || 0}</Badge>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3 mb-4">
                    <Textarea
                      placeholder="Write a comment... (Ctrl+Enter to post)"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                      }}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                        className="h-8"
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1.5" />
                            Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {ticket.comments && ticket.comments.length > 0 && (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      {ticket.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background">
                            <AvatarImage src={resolveImageUrl(comment.user?.image)} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {comment.user?.firstName} {comment.user?.lastName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {comment.createdAt ? format(new Date(comment.createdAt), "MMM d 'at' h:mm a") : ""}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!ticket.comments || ticket.comments.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </div>

              
              <div className="p-4 sm:p-6 bg-muted/20 space-y-4">
                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Status</label>
                  <Select value={ticket.status || "TODO"} onValueChange={(value) => autoSave({ status: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses?.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      )) || (
                        <>
                          <SelectItem value="TODO"><span className="flex items-center gap-2"><Circle className="h-3 w-3" /> To Do</span></SelectItem>
                          <SelectItem value="IN_PROGRESS"><span className="flex items-center gap-2"><Timer className="h-3 w-3 text-blue-500" /> In Progress</span></SelectItem>
                          <SelectItem value="IN_REVIEW"><span className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-purple-500" /> In Review</span></SelectItem>
                          <SelectItem value="DONE"><span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Done</span></SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Priority</label>
                  <Select value={ticket.priority || "MEDIUM"} onValueChange={(value) => autoSave({ priority: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Type</label>
                  <Select value={ticket.type || "TASK"} onValueChange={(value) => autoSave({ type: value })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TASK">Task</SelectItem>
                      <SelectItem value="BUG">Bug</SelectItem>
                      <SelectItem value="STORY">Story</SelectItem>
                      <SelectItem value="EPIC">Epic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Assignee</label>
                  <Select
                    value={ticket.assignee?.id || "unassigned"}
                    onValueChange={(value) => autoSave({ assigneeId: value === "unassigned" ? "" : value })}
                  >
                    <SelectTrigger className="bg-background">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                            <AvatarFallback className="text-[10px]">
                              {ticket.assignee.firstName?.[0]}{ticket.assignee.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{ticket.assignee.firstName} {ticket.assignee.lastName}</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Unassigned" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground">Unassigned</span>
                      </SelectItem>
                      {members?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={resolveImageUrl(member.image)} />
                              <AvatarFallback className="text-[10px]">
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.firstName} {member.lastName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Sprint
                  </label>
                  <Select
                    value={ticket.sprintId?.toString() || "none"}
                    onValueChange={(value) => autoSave({ sprintId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="No sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No sprint</SelectItem>
                      {sprints?.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id.toString()}>
                          {sprint.name} {sprint.status === "ACTIVE" ? "(Active)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Epic
                  </label>
                  <Select
                    value={ticket.epicId?.toString() || "none"}
                    onValueChange={(value) => autoSave({ epicId: value === "none" ? undefined : parseInt(value) })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="No epic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No epic</SelectItem>
                      
                    </SelectContent>
                  </Select>
                </div>

                
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">Story Points</label>
                  <Input
                    type="number"
                    min={0}
                    value={ticket.points ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                      autoSave({ points: val });
                    }}
                    className="bg-background h-9"
                    placeholder="0"
                  />
                </div>

                
                {(timeSpent > 0 || originalEstimate > 0) && (
                  <div className="rounded-lg border bg-background p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5" />
                      Time Tracking
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>{timeSpent}h logged</span>
                      {originalEstimate > 0 && <span>{originalEstimate}h estimated</span>}
                    </div>
                    {originalEstimate > 0 && (
                      <Progress value={timeProgress} className="h-1.5" />
                    )}
                  </div>
                )}

                
                <LabelPicker
                  ticketId={ticketId!}
                  currentLabels={ticket.labels || []}
                />

                
                {ticket.link && (
                  <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Attached Link
                    </div>
                    <a
                      href={ticket.link.startsWith('http') ? ticket.link : `https://${ticket.link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1.5 break-all font-medium transition-colors"
                    >
                      <span className="truncate">{ticket.link}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                )}

                
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    <User className="h-3.5 w-3.5" />
                    Created By
                  </div>
                  {ticket.reporter ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                        <AvatarImage src={resolveImageUrl(ticket.reporter.image)} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {ticket.reporter.firstName?.[0]}{ticket.reporter.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {ticket.reporter.firstName} {ticket.reporter.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {ticket.reporter.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </div>

                
                <div className="rounded-lg border bg-background p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created</span>
                    <span className="ml-auto font-medium text-foreground">
                      {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated</span>
                    <span className="ml-auto font-medium text-foreground">
                      {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-medium">Ticket not found</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
