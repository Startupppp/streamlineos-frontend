"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useProjects, useCreateTicket } from "@/hooks/api/projects";
import { queryKeys } from "@/lib/query-keys";
import type { CreateTicketInput } from "@/types/projects";

const schema = z.object({
  projectId: z.string().min(1, "Select a project"),
  title: z.string().min(1, "Title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

type FormValues = z.infer<typeof schema>;

interface CreateTicketFromCalendarDialogProps {
  open: boolean;
  onClose: () => void;
  defaultSlot?: { start: Date; end: Date } | null;
}

function defaultDueDate(slot?: { start: Date; end: Date } | null): string {
  return format(slot?.start ?? new Date(), "yyyy-MM-dd");
}

export function CreateTicketFromCalendarDialog({
  open,
  onClose,
  defaultSlot,
}: CreateTicketFromCalendarDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: projectsLoading } = useProjects(undefined, {
    enabled: open,
  });
  const projects = projectsData?.data ?? [];

  const createTicket = useCreateTicket();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: "",
      title: "",
      dueDate: defaultDueDate(defaultSlot),
      priority: "MEDIUM",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        projectId: "",
        title: "",
        dueDate: defaultDueDate(defaultSlot),
        priority: "MEDIUM",
      });
    }
  }, [open, defaultSlot, form]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const numericProjectId = Number(values.projectId);
      const ticketInput: CreateTicketInput & { dueDate?: string } = {
        projectId: numericProjectId,
        title: values.title,
        type: "TASK",
        priority: values.priority,
        dueDate: values.dueDate,
      };
      try {
        const ticket = await createTicket.mutateAsync(ticketInput);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.calendar.all,
          exact: false,
        });
        const targetProjectId = ticket.projectId ?? numericProjectId;
        toast.success("Ticket created", {
          action: {
            label: "View ticket",
            onClick: () => router.push(`/projects/${targetProjectId}?ticket=${ticket.id}`),
          },
        });
        handleOpenChange(false);
      } catch {
        toast.error("Failed to create ticket");
      }
    },
    [createTicket, queryClient, router, handleOpenChange],
  );

  const isPending = createTicket.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-sm font-semibold">Add ticket due date</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-5 pb-0 space-y-3 pt-3">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Project</FormLabel>
                  <FormControl>
                    {projectsLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : projects.length === 0 ? (
                      <div className="flex flex-col items-start gap-1 py-2 text-xs text-muted-foreground">
                        <span>No projects found.</span>
                        <Link
                          href="/projects"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          <FolderOpen className="inline h-3 w-3 mr-1" />
                          Go to Projects
                        </Link>
                      </div>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                              <span className="font-mono text-[10px] text-muted-foreground mr-1.5">
                                {p.key}
                              </span>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ticket title"
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Due date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Priority</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW" className="text-xs">Low</SelectItem>
                        <SelectItem value="MEDIUM" className="text-xs">Medium</SelectItem>
                        <SelectItem value="HIGH" className="text-xs">High</SelectItem>
                        <SelectItem value="URGENT" className="text-xs">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="px-5 py-4 border-t flex-row gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isPending || projects.length === 0}
          >
            {isPending ? "Creating…" : "Create ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
