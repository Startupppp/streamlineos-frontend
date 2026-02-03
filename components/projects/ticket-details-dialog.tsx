"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useProjectMembers,
  useAddComment,
  vaivammKeys,
} from "../../lib/hooks/trpc-hooks";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
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
  Timer
} from "lucide-react";
import { toast } from "sonner";
import { updateTicketInputSchema } from "../../lib/validations/project";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { viewFile, getSignedFileUrl } from "@/hooks/use-file-url";

const formSchema = updateTicketInputSchema;

type FormValues = z.infer<typeof formSchema>;

// Component to handle attachment image loading with signed URLs
function AttachmentImage({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadImage = async () => {
      try {
        const signedUrl = await getSignedFileUrl(fileUrl);
        if (mounted) {
          setImageSrc(signedUrl);
        }
      } catch {
        // Fallback to original URL (might work for local files)
        if (mounted) {
          setImageSrc(fileUrl);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
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
      onError={(e) => {
        // Hide broken images
        (e.target as HTMLImageElement).style.display = 'none';
      }}
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

const statusConfig = {
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
  const { data: ticket, isLoading } = useTicket(ticketId || 0);
  const { data: members } = useProjectMembers();

  const updateTicketMutation = useUpdateTicket({
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(ticketId!),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update ticket");
    },
  });

  const deleteTicketMutation = useDeleteTicket({
    onSuccess: () => {
      toast.success("Ticket deleted successfully");
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete ticket");
    },
  });

  const addCommentMutation = useAddComment({
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(ticketId!),
      });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  const handleAddComment = () => {
    if (!commentText.trim() || !ticketId) return;
    addCommentMutation.mutate({
      ticketId,
      content: commentText.trim(),
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticketId: ticketId || 0,
      title: "",
      description: "",
      type: "TASK",
      priority: "MEDIUM",
      status: "TODO",
      assigneeId: undefined,
    },
  });

  useEffect(() => {
    if (ticket) {
      form.reset({
        ticketId: ticket.id,
        title: ticket.title,
        description: ticket.description || "",
        type: ticket.type || "TASK",
        priority: ticket.priority || "MEDIUM",
        status: ticket.status || "TODO",
        assigneeId: ticket.assignee?.id || undefined,
      });
    } else {
      form.reset({
        ticketId: ticketId || 0,
        title: "",
        description: "",
        type: "TASK",
        priority: "MEDIUM",
        status: "TODO",
        assigneeId: undefined,
      });
    }
  }, [ticket, ticketId, form]);

  const onSubmit = (values: FormValues) => {
    updateTicketMutation.mutate({
        ...values,
        ticketId: ticketId!,
        // Send empty string for unassigned so server knows to clear assignee
        assigneeId: values.assigneeId === "unassigned" ? "" : values.assigneeId,
    });
  };

  const currentPriority = ticket?.priority as keyof typeof priorityConfig || "MEDIUM";
  const currentStatus = ticket?.status as keyof typeof statusConfig || "TODO";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-1/2 sm:max-w-[50vw] overflow-hidden p-0"
      >
        {/* Header */}
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
                      <Badge className={statusConfig[currentStatus]?.color || statusConfig.TODO.color}>
                        {statusConfig[currentStatus]?.label || ticket.status}
                      </Badge>
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
                          This action cannot be undone. The ticket and all comments will be permanently deleted.
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

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-120px)]">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Loading ticket details...</p>
            </div>
          ) : ticket ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                  {/* Main Content - Left Side */}
                  <div className="lg:col-span-2 p-4 sm:p-6 space-y-6 border-r">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Title</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-base font-medium border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              className="min-h-[120px] border-0 bg-muted/30 focus-visible:bg-background focus-visible:ring-1 resize-none"
                              placeholder="Add a detailed description..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Attachments */}
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

                    {/* Comments Section */}
                    <div className="pt-6 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold">Comments</h4>
                        <Badge variant="secondary" className="text-xs">{ticket.comments?.length || 0}</Badge>
                      </div>
                      
                      {/* Comment Input */}
                      <div className="bg-muted/30 rounded-lg p-3 mb-4">
                        <Textarea
                          placeholder="Write a comment... (Ctrl+Enter to post)"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="min-h-[60px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                              handleAddComment();
                            }
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

                      {/* Comments List */}
                      {ticket.comments && ticket.comments.length > 0 && (
                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                          {ticket.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 group">
                              <Avatar className="h-8 w-8 shrink-0 ring-2 ring-background">
                                <AvatarImage src={comment.user?.image || undefined} />
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

                  {/* Sidebar - Right Side */}
                  <div className="p-4 sm:p-6 bg-muted/20 space-y-5">
                    {/* Quick Status Fields */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statuses?.map((s) => (
                                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                )) || (
                                  <>
                                    <SelectItem value="TODO">
                                      <span className="flex items-center gap-2"><Circle className="h-3 w-3" /> To Do</span>
                                    </SelectItem>
                                    <SelectItem value="IN_PROGRESS">
                                      <span className="flex items-center gap-2"><Timer className="h-3 w-3 text-blue-500" /> In Progress</span>
                                    </SelectItem>
                                    <SelectItem value="IN_REVIEW">
                                      <span className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-purple-500" /> In Review</span>
                                    </SelectItem>
                                    <SelectItem value="DONE">
                                      <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-green-500" /> Done</span>
                                    </SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="URGENT">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="TASK">Task</SelectItem>
                                <SelectItem value="BUG">Bug</SelectItem>
                                <SelectItem value="STORY">Story</SelectItem>
                                <SelectItem value="EPIC">Epic</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assigneeId"
                        render={({ field }) => {
                          const fieldValue = field.value || undefined;
                          const selectedMember = fieldValue && fieldValue !== "unassigned" 
                            ? members?.find(m => m.id === fieldValue)
                            : null;
                          return (
                            <FormItem>
                              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Assignee</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : value)} 
                                value={fieldValue || "unassigned"}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-background">
                                    {selectedMember ? (
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage src={selectedMember.image || undefined} />
                                          <AvatarFallback className="text-[10px]">
                                            {selectedMember.firstName?.[0]}{selectedMember.lastName?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{selectedMember.firstName} {selectedMember.lastName}</span>
                                      </div>
                                    ) : (
                                      <SelectValue placeholder="Unassigned" />
                                    )}
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    <span className="text-muted-foreground">Unassigned</span>
                                  </SelectItem>
                                  {members?.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage src={member.image || undefined} />
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
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Link Card */}
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

                    {/* Created By Card */}
                    <div className="rounded-lg border bg-background p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        <User className="h-3.5 w-3.5" />
                        Created By
                      </div>
                      {ticket.reporter ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                            <AvatarImage src={ticket.reporter.image || undefined} />
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

                    {/* Timestamps */}
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

                    {/* Save Button */}
                    <Button 
                      type="submit" 
                      className="w-full h-11 font-semibold"
                      disabled={updateTicketMutation.isPending}
                    >
                      {updateTicketMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
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
