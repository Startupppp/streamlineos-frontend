"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateTicket,
  useAddAttachment,
  useProject,
} from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { createTicketInputSchema } from "@/lib/validations/project";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";

const formSchema = createTicketInputSchema.omit({ projectId: true }).extend({
  assigneeIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateTicketDialog({
  projectId,
  variant = "default"
}: {
  projectId: number;
  variant?: "default" | "fab";
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { data: projectData } = useProject(projectId);
  const projectMembersList = projectData?.members?.filter(m => !!m.user).map(m => ({
    id: m.user!.id,
    name: m.user!.name || `${m.user!.firstName || ''} ${m.user!.lastName || ''}`.trim(),
    firstName: m.user!.firstName || undefined,
    lastName: m.user!.lastName || undefined,
    image: m.user!.image || null,
    email: m.user!.email,
  })) || [];
  const manager = projectData && "manager" in projectData
    ? (projectData as { manager?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; image?: string | null; email?: string | null } }).manager
    : undefined;
  const members = manager && !projectMembersList.some(m => m.id === manager.id)
    ? [
        {
          id: manager.id,
          name: manager.name || `${manager.firstName || ''} ${manager.lastName || ''}`.trim(),
          firstName: manager.firstName || undefined,
          lastName: manager.lastName || undefined,
          image: manager.image || null,
          email: manager.email || '',
        },
        ...projectMembersList
      ]
    : projectMembersList;

  const addAttachmentMutation = useAddAttachment();

  const createTicketMutation = useCreateTicket({
    onSuccess: async (data) => {
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
      toast.error(getErrorMessage(error));
    },
  });

  const finishCreation = () => {
    setOpen(false);
    form.reset();
    setFile(null);
    setSelectedAssignees([]);
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.detail(projectId),
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
      assigneeId: undefined,
      assigneeIds: [],
    },
  });

  const onSubmit = (values: FormValues) => {
    createTicketMutation.mutate({
      ...values,
      projectId,
      type: values.type,
      link: values.link || undefined,
      assigneeId: selectedAssignees[0] || undefined,
      assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "fab" ? (
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Create Ticket</span>
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-1/2 sm:max-w-[50vw] overflow-y-auto p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle>New Ticket</SheetTitle>
        </SheetHeader>
        <div className="p-6 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TASK">Task</SelectItem>
                          <SelectItem value="BUG">Bug</SelectItem>
                          <SelectItem value="STORY">Story</SelectItem>
                          <SelectItem value="EPIC">Epic</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                      value={field.value}
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
                    <Input placeholder="E.g. Implement login page" {...field} className="text-base font-medium capitalize" />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <FormItem>
                    <FormLabel>Assignees</FormLabel>

                    {selectedAssignees.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {selectedAssignees.map((id) => {
                          const member = members?.find((m) => m.id === id);
                          if (!member) return null;
                          return (
                            <div key={id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={resolveImageUrl(member.image)} />
                                <AvatarFallback className="text-[8px]">{member.name?.[0] || "U"}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[100px]">{member.name || `${member.firstName || ''} ${member.lastName || ''}`}</span>
                              <button
                                type="button"
                                className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => setSelectedAssignees((prev) => prev.filter((a) => a !== id))}
                                aria-label={`Remove ${member.name}`}
                              >
                                <span className="text-xs font-bold">&times;</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!value || value === "unassigned") return;
                        if (selectedAssignees.includes(value)) return;
                        setSelectedAssignees((prev) => [...prev, value]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedAssignees.length > 0 ? "+ Add another assignee" : "Select assignees"} />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.filter((m) => !selectedAssignees.includes(m.id)).map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                               <Avatar className="h-7 w-7">
                                  <AvatarImage src={resolveImageUrl(member.image)} />
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
                    {!file ? (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium text-foreground">
                                Click or drag to upload
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Images, PDF, DOC, XLS up to 25MB
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0];
                                    if (selected) {
                                        if (selected.size > 25 * 1024 * 1024) {
                                            toast.error("File size must be less than 25MB");
                                            return;
                                        }
                                        setFile(selected);
                                    }
                                }}
                            />
                        </label>
                    ) : (
                        <div className="flex items-center gap-4 p-4 border border-dashed rounded-lg bg-muted/20">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <label className="cursor-pointer">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="shrink-0 pointer-events-none"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Change
                                </Button>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => {
                                        const selected = e.target.files?.[0];
                                        if (selected) {
                                            if (selected.size > 25 * 1024 * 1024) {
                                                toast.error("File size must be less than 25MB");
                                                return;
                                            }
                                            setFile(selected);
                                        }
                                    }}
                                />
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setFile(null)}
                                className="text-destructive h-8 w-8 shrink-0"
                            >
                                <span className="sr-only">Remove</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </Button>
                        </div>
                    )}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
