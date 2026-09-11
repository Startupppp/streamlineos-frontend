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
import { useUpdateTicket } from "@/hooks/api/build";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { activationProps } from "@/lib/keyboard-activation";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

const MEANINGFUL_TEXT_RE = /[a-zA-Z0-9À-ɏЀ-ӿ一-鿿]/;

const editEpicSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v), "Title must contain at least one letter or number"),
  description: z.string().max(2000, "Description must be 2,000 characters or fewer").optional(),
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
  /**
   * Controlled mode, for a caller that opens this from a menu item. Without it
   * the caller has to render a trigger, and a caller with no visible trigger to
   * offer ends up rendering a hidden proxy button — which the sheet then
   * restores focus to on close, stranding a keyboard user on an element that is
   * not there.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function toPriority(value: string | null | undefined): EditEpicInput["priority"] {
  return PRIORITIES.find((p) => p === value) ?? "MEDIUM";
}

function toStatus(value: string | null | undefined): EditEpicInput["status"] {
  return STATUSES.find((s) => s === value) ?? "TODO";
}

const STATUS_LABEL: Record<EditEpicInput["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function EditEpicDialog({
  epic,
  projectId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditEpicDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : uncontrolledOpen;
  const queryClient = useQueryClient();

  const setOpen = (next: boolean) => {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const handleOpen = () => setOpen(true);

  const updateTicket = useUpdateTicket(projectId, {
    onSuccess: () => {
      toast.success("Epic updated");
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.detail(projectId) });
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
      {controlled ? null : trigger ? (
        <span {...activationProps(handleOpen)}>
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
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <span className="text-micro text-muted-foreground tabular-nums">
                      {(field.value ?? "").length} / 2000
                    </span>
                  </div>
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
