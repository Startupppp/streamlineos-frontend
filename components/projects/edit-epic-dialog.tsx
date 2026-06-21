"use client";

import { ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateTicket } from "@/lib/api/hooks/projects";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

const editEpicSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(PRIORITIES),
  status: z.enum(STATUSES),
});

type EditEpicInput = z.infer<typeof editEpicSchema>;

interface EditEpicDialogProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    priority?: string | null;
    status: string | null;
  };
  projectId: number;
  trigger?: ReactNode;
}

function toPriority(value: string | null | undefined): EditEpicInput["priority"] {
  return PRIORITIES.includes(value as EditEpicInput["priority"])
    ? (value as EditEpicInput["priority"])
    : "MEDIUM";
}

function toStatus(value: string | null | undefined): EditEpicInput["status"] {
  return STATUSES.includes(value as EditEpicInput["status"])
    ? (value as EditEpicInput["status"])
    : "TODO";
}

const STATUS_LABEL: Record<EditEpicInput["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function EditEpicDialog({ epic, projectId, trigger }: EditEpicDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleOpen = () => setOpen(true);

  const updateTicket = useUpdateTicket(projectId, {
    onSuccess: () => {
      toast.success("Epic updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      setOpen(false);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const handleSubmit = (data: EditEpicInput) => {
    updateTicket.mutate({
      ticketId: epic.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
    });
  };

  const defaultValues: EditEpicInput = {
    title: epic.title,
    description: epic.description ?? "",
    priority: toPriority(epic.priority),
    status: toStatus(epic.status),
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} role="button" tabIndex={0}>
          {trigger}
        </span>
      ) : (
        <Button variant="ghost" size="sm" onClick={handleOpen}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}
      <EntityFormSheet<EditEpicInput>
        open={open}
        onOpenChange={setOpen}
        title="Edit epic"
        resolver={zodResolver(editEpicSchema)}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={updateTicket.isPending}
        resetOnOpen
        submitLabel="Save changes"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-violet-500" />
                    Title
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      className="resize-none"
                      rows={3}
                      placeholder="Epic description..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
      </EntityFormSheet>
    </>
  );
}
