"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useProjectMembers,
  vaivammKeys,
} from "../../lib/hooks/trpc-hooks";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
import { Trash2, Link as LinkIcon, ExternalLink } from "lucide-react";
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
import { useState } from "react";

const formSchema = updateTicketInputSchema;

type FormValues = z.infer<typeof formSchema>;

interface TicketDetailsDialogProps {
  ticketId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  statuses?: Array<{ name: string; id: number }>;
}

export function TicketDetailsDialog({
  ticketId,
  open,
  onOpenChange,
  projectId,
  statuses,
}: TicketDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: ticket, isLoading } = useTicket(ticketId || 0);
  const { data: members } = useProjectMembers();

  // ... (rest of hook calls) ...

  const updateTicketMutation = useUpdateTicket({
    onSuccess: () => {
      toast.success("Ticket updated successfully");
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.ticket(ticketId!),
      });
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
        assigneeId: ticket.assignee?.id,
      });
    }
  }, [ticket, form]);

  const onSubmit = (values: FormValues) => {
    updateTicketMutation.mutate({
        ...values,
        ticketId: ticketId!,
        assigneeId: values.assigneeId === "unassigned" ? undefined : values.assigneeId,
    });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
                <span className="text-muted-foreground">#{ticketId}</span>
                {isLoading ? "Loading..." : ticket?.title}
            </span>
            {ticket && (
                 <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Delete Ticket</h4>
                        <p className="text-sm text-muted-foreground">
                          Are you sure you want to delete this ticket? This action cannot be undone.
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
                          {deleteTicketMutation.isPending ? "Deleting..." : "Confirm Delete"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading details...</div>
        ) : ticket ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-lg font-medium" />
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            className="min-h-[150px]"
                            placeholder="Add a more detailed description..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {ticket.link && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <a href={ticket.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                              {ticket.link}
                              <ExternalLink className="h-3 w-3" />
                          </a>
                      </div>
                  )}

                  {/* Attachments Section could go here, but focusing on CRUD fields first as requested */}
                  {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="space-y-2">
                          <h4 className="text-sm font-medium">Attachments</h4>
                          <div className="grid grid-cols-2 gap-2">
                              {ticket.attachments.map((att) => (
                                  <div key={att.id} className="relative group border rounded-md overflow-hidden aspect-video bg-muted">
                                      {att.mimeType && att.mimeType.startsWith('image/') ? (
                                           <img src={att.fileUrl} alt={att.fileName} className="object-cover w-full h-full" />
                                      ) : (
                                          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                                              {att.fileName}
                                          </div>
                                      )}
                                      <a 
                                        href={att.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                      >
                                          <ExternalLink className="h-4 w-4" />
                                      </a>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statuses?.map((s) => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            )) || (
                                <>
                                    <SelectItem value="TODO">To Do</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                                    <SelectItem value="DONE">Done</SelectItem>
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
                        <FormLabel>Priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                         <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {members?.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-4 w-4">
                                    <AvatarImage src={member.image || undefined} />
                                    <AvatarFallback className="text-[8px]">
                                      {member.firstName?.[0]}
                                      {member.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[120px]">
                                    {member.firstName} {member.lastName}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  

                  <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                      <div>Created: {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "-"}</div>
                      <div>Updated: {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : "-"}</div>
                      {ticket.reporter && (
                          <div>Reporter: {ticket.reporter.firstName} {ticket.reporter.lastName}</div>
                      )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateTicketMutation.isPending}
                  >
                    {updateTicketMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        ) : (
             <div className="text-center text-red-500">Ticket not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
