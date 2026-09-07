"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
import { FolderOpenIcon } from "@animateicons/react/lucide";
import Link from "next/link";
import { useProjects, useCreateTicket } from "@/hooks/api/build";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import type { CreateTicketInput } from "@/types/projects";
import {
  createTicketFromCalendarSchema,
  type CreateTicketFromCalendarInput,
} from "./create-ticket-from-calendar-schema";

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

  const form = useForm<CreateTicketFromCalendarInput>({
    resolver: zodResolver(createTicketFromCalendarSchema),
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
    async (values: CreateTicketFromCalendarInput) => {
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
          queryKey: platformHierarchyQueryKeys.calendar.all,
          exact: false,
        });
        const targetProjectId = ticket.projectId ?? numericProjectId;
        toast.success("Ticket created", {
          action: {
            label: "View ticket",
            onClick: () => router.push(`/build/${targetProjectId}?ticket=${ticket.id}`),
          },
        });
        handleOpenChange(false);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [createTicket, queryClient, router, handleOpenChange],
  );

  const isPending = createTicket.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 pb-0 md:pb-0 w-full max-w-none sm:max-w-sm">
        <DialogHeader className="px-4 py-3">
          <DialogTitle className="text-sm font-semibold">Add ticket due date</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="px-4 py-2 space-y-2">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-medium">
                    Project <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    {projectsLoading ? (
                      <Skeleton className="h-4 w-full" />
                    ) : projects.length === 0 ? (
                      <div className="flex flex-col items-start gap-1 py-2 text-xs text-muted-foreground">
                        <span>No projects found.</span>
                        <Link
                          href="/build/all"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          <FolderOpenIcon size={12} className="inline mr-1" />
                          Go to Projects
                        </Link>
                      </div>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                              <span className="font-mono text-micro text-muted-foreground mr-1.5">
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
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-medium">
                    Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ticket title"
                      className="text-sm"
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
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-medium">
                    Due date <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-medium">Priority</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="text-xs">
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

        <DialogFooter className="px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t flex-row gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            className="text-xs"
            onClick={form.handleSubmit(handleSubmit)}
            isPending={isPending}
            loadingText="Creating…"
            disabled={projects.length === 0}
          >
            Create ticket
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
