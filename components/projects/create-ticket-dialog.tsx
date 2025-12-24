"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateTicket,
  useAddAttachment,
  useProjectMembers,
  vaivammKeys,
} from "../../lib/hooks/trpc-hooks";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { createTicketInputSchema } from "../../lib/validations/project";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const formSchema = createTicketInputSchema.omit({ projectId: true });

type FormValues = z.infer<typeof formSchema>;

export function CreateTicketDialog({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: members } = useProjectMembers();

  const addAttachmentMutation = useAddAttachment();

  const createTicketMutation = useCreateTicket({
    onSuccess: async (data) => {
      
      // Upload file if selected
      if (file) {
        try {
          setIsUploading(true);
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "tickets");

          const response = await fetch("/api/storage/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Failed to upload file");
          
          const result = await response.json();
          
          await addAttachmentMutation.mutateAsync({
            ticketId: data.id,
            fileUrl: result.url,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
          
          toast.success("Ticket created with attachment");
        } catch (error) {
          console.error(error);
          toast.error("Ticket created but failed to upload attachment");
        } finally {
          setIsUploading(false);
          finishCreation();
        }
      } else {
        toast.success("Ticket created successfully");
        finishCreation();
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create ticket");
    },
  });

  const finishCreation = () => {
    setOpen(false);
    form.reset();
    setFile(null);
    queryClient.invalidateQueries({
      queryKey: vaivammKeys.project.project(projectId),
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "TASK",
      description: "",
      priority: "MEDIUM",
      link: "",
      assigneeId: undefined, // "undefined" string or standard undefined? Schema expects string optional.
    },
  });

  const onSubmit = (values: FormValues) => {
    createTicketMutation.mutate({
      ...values,
      projectId,
      type: values.type === "FEATURE" ? "STORY" : values.type,
      link: values.link || undefined,
      assigneeId: values.assigneeId === "unassigned" ? undefined : values.assigneeId, 
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
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
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TASK">
                            <div className="flex items-center">
                                <span className="mr-2">📝</span> Task
                            </div>
                        </SelectItem>
                        <SelectItem value="BUG">
                             <div className="flex items-center">
                                <span className="mr-2">🐞</span> Issue
                            </div>
                        </SelectItem>
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
                        <SelectTrigger className="w-full">
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
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Implement login page" {...field} className="text-base font-medium" />
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
                      placeholder="Describe the issue or task in detail..." 
                      className="min-h-[120px] resize-y"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
               <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select assignee" />
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
                                  <AvatarFallback className="text-[10px]">{member.name?.[0] || "U"}</AvatarFallback>
                               </Avatar>
                               <span className="truncate">{member.name || `${member.firstName || ''} ${member.lastName || ''}`}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="https://..." {...field} value={field.value || ""} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormItem className="pt-2">
                <FormLabel>Attachment</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-4 p-4 border border-dashed rounded-lg bg-muted/20">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => document.getElementById('ticket-file-upload')?.click()}
                            className="w-full sm:w-auto"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {file ? "Change Image" : "Upload Image"}
                        </Button>
                        <Input 
                            id="ticket-file-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                const selected = e.target.files?.[0];
                                if (selected) setFile(selected);
                            }}
                        />
                         {file && (
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm text-muted-foreground truncate">{file.name}</span>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setFile(null)}
                                    className="text-destructive h-8 w-8 ml-auto"
                                >
                                    <span className="sr-only">Remove</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </Button>
                            </div>
                        )}
                    </div>
                </FormControl>
            </FormItem>

            <Button
              type="submit"
              disabled={createTicketMutation.isPending || isUploading}
              className="w-full"
            >
              {createTicketMutation.isPending || isUploading ? "Creating..." : "Create Ticket"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
