"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  editEpicSchema,
  EPIC_PRIORITIES,
  EPIC_STATUSES,
  type EditEpicInput,
} from "./epic-schema";
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
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError, getApiErrorCode } from "@/lib/api-envelope";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import { activationProps } from "@/lib/keyboard-activation";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  toPriority,
  toStatus,
  STATUS_LABEL,
  buildEpicConflictDiffs,
} from "./edit-epic-model";

interface EditEpicDialogProps {
  epic: {
    id: number;
    title: string;
    description?: string | null;
    priority?: string | null;
    status: string | null;
    version: number;
  };
  projectId: number;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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
  const isOnline = useOnlineStatus();

  const setOpen = (next: boolean) => {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const handleOpen = () => setOpen(true);
  const [conflictFields, setConflictFields] = useState<
    TicketConflictFieldDiff[] | null
  >(null);
  const pendingValuesRef = useRef<EditEpicInput | null>(null);

  const updateTicket = useUpdateTicket(projectId, {
    onSuccess: () => {
      toast.success("Epic updated");
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(projectId),
      });
      setOpen(false);
    },
    onError: (error) => {
      if (
        isApiError(error) &&
        getApiErrorCode(error) === "PROJECTS_TICKET_CONFLICT"
      ) {
        void queryClient.invalidateQueries({
          queryKey: buildWorkQueryKeys.projects.detail(projectId),
        });
        const pending = pendingValuesRef.current;
        const diffs = pending ? buildEpicConflictDiffs(pending, epic) : [];
        setConflictFields(
          diffs.length > 0
            ? diffs
            : [
                {
                  key: "version",
                  label: "Version",
                  serverValue: "Updated by another user",
                  pendingValue: "Your edit",
                },
              ],
        );
        return;
      }
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (data: EditEpicInput) => {
    if (!isOnline) {
      toast.warning(
        "You're offline — your draft is kept here and nothing was sent.",
      );
      return;
    }
    pendingValuesRef.current = data;
    updateTicket.mutate({
      ticketId: epic.id,
      version: epic.version,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
    });
  };

  const handleKeepMine = useCallback(() => setConflictFields(null), []);
  const handleDiscardConflict = useCallback(() => {
    setConflictFields(null);
    setOpen(false);
  }, [setOpen]);

  const defaultValues: EditEpicInput = {
    title: epic.title,
    description: epic.description ?? "",
    priority: toPriority(epic.priority),
    status: toStatus(epic.status),
  };

  return (
    <>
      {controlled ? null : trigger ? (
        <span {...activationProps(handleOpen)}>{trigger}</span>
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
                        {EPIC_PRIORITIES.map((p) => (
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
                        {EPIC_STATUSES.map((s) => (
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
      {conflictFields !== null ? (
        <TicketConflictDialog
          open
          fields={conflictFields}
          onKeepMine={handleKeepMine}
          onDiscard={handleDiscardConflict}
        />
      ) : null}
    </>
  );
}
