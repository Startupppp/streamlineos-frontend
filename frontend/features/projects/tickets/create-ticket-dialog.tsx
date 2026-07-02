
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateTicket,
  useAddAttachment,
  useProject,
} from "@/hooks/api";
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
import { Plus, Upload, Link as LinkIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { createTicketInputSchema } from "@/lib/validation/projects";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);

const formSchema = createTicketInputSchema.omit({ projectId: true }).extend({
  assigneeIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MemberUser {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  email?: string | null;
}

interface CreateTicketDialogProps {
  projectId: number;
  variant?: "default" | "fab";
}

function isProjectWithManager(data: unknown): data is { manager?: MemberUser } {
  return typeof data === "object" && data !== null && "manager" in data;
}

export function CreateTicketDialog({
  projectId,
  variant = "default",
}: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { data: projectData } = useProject(projectId);

  const projectMembersList =
    projectData?.members
      ?.filter(
        (m): m is typeof m & { user: NonNullable<typeof m.user> } =>
          m.user != null,
      )
      .map((m) => ({
        id: m.user.id,
        name:
          m.user.name ||
          `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim(),
        firstName: m.user.firstName ?? undefined,
        lastName: m.user.lastName ?? undefined,
        image: m.user.image ?? null,
        email: m.user.email,
      })) ?? [];

  const manager =
    projectData && isProjectWithManager(projectData)
      ? projectData.manager
      : undefined;
  const members =
    manager && !projectMembersList.some((m) => m.id === manager.id)
      ? [
          {
            id: manager.id,
            name:
              manager.name ||
              `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim(),
            firstName: manager.firstName ?? undefined,
            lastName: manager.lastName ?? undefined,
            image: manager.image ?? null,
            email: manager.email ?? "",
          },
          ...projectMembersList,
        ]
      : projectMembersList;

  const addAttachmentMutation = useAddAttachment();

  const createTicketMutation = useCreateTicket({
    onSuccess: async (data) => {
      if (files.length > 0) {
        try {
          setIsUploading(true);
          await Promise.all(
            files.map(async (file) => {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("folder", "tickets");
              const result = await apiClient.upload<{ url: string }>(
                "/storage/upload",
                formData,
              );
              await addAttachmentMutation.mutateAsync({
                ticketId: data.id,
                fileUrl: result.url,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
              });
            }),
          );
          toast.success(
            `Ticket created with ${files.length} attachment${files.length > 1 ? "s" : ""}`,
          );
        } catch {
          toast.error("Ticket created but failed to upload attachments");
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
    setFiles([]);
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

  const handleSubmit = (values: FormValues) => {
    createTicketMutation.mutate({
      ...values,
      projectId,
      type: values.type,
      link: values.link || undefined,
      assigneeId: selectedAssignees[0] || undefined,
      assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
    });
  };

  const handleAssigneeSelect = (value: string) => {
    if (!value || value === "unassigned") return;
    if (selectedAssignees.includes(value)) return;
    setSelectedAssignees((prev) => [...prev, value]);
  };

  const handleRemoveAssignee = (id: string) => () =>
    setSelectedAssignees((prev) => prev.filter((a) => a !== id));

  const handleRemoveFile = (idx: number) => () =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 25MB limit`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "fab" ? (
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Create Ticket"
          >
            <Plus className="h-6 w-6" />
          </Button>
        ) : (
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
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
        <div className="px-6 py-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                      <Input
                        placeholder="E.g. Implement login page"
                        {...field}
                        className="text-base font-medium capitalize"
                      />
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
                      <TiptapEditorDynamic
                        content={field.value ?? ""}
                        onChangeHtml={(html) => field.onChange(html)}
                        output="html"
                        minHeightClassName="min-h-[120px]"
                        placeholder="Describe the ticket…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Assignees</FormLabel>

                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedAssignees.map((id) => {
                        const member = members?.find((m) => m.id === id);
                        if (!member) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={resolveImageUrl(member.image)}
                              />
                              <AvatarFallback className="text-[8px]">
                                {member.name?.[0] ?? "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[100px]">
                              {member.name ||
                                `${member.firstName ?? ""} ${member.lastName ?? ""}`}
                            </span>
                            <button
                              type="button"
                              className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={handleRemoveAssignee(id)}
                              aria-label={`Remove ${member.name}`}
                            >
                              <span className="text-xs font-bold">&times;</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Select value="" onValueChange={handleAssigneeSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          selectedAssignees.length > 0
                            ? "+ Add another assignee"
                            : "Select assignees"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {members
                        ?.filter((m) => !selectedAssignees.includes(m.id))
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={resolveImageUrl(member.image)}
                                />
                                <AvatarFallback className="text-[10px]">
                                  {member.name?.[0] ?? "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">
                                {member.name ||
                                  `${member.firstName ?? ""} ${member.lastName ?? ""}`}
                              </span>
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
                          <Input
                            className="pl-9"
                            placeholder="https://..."
                            {...field}
                            value={field.value ?? ""}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem className="pt-2">
                <FormLabel>Attachments</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        {files.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 border border-border rounded-lg bg-muted/20"
                          >
                            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveFile(idx)}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                              aria-label="Remove file"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs font-medium text-foreground">
                        {files.length > 0
                          ? "Add more files"
                          : "Click to upload"}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        Images, PDF, DOC, XLS up to 25MB each
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        multiple
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </FormControl>
              </FormItem>

              <Button
                type="submit"
                disabled={createTicketMutation.isPending || isUploading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                {createTicketMutation.isPending || isUploading
                  ? "Creating..."
                  : "Create Ticket"}
              </Button>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
