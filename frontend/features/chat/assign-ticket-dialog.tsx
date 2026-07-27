"use client";

import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form } from "@/components/ui/form";
import { useProjects, useProjectMembers } from "@/hooks/api/build/projects";
import { useAssignTicketFromChat } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { TicketCombobox } from "./ticket-combobox";

const schema = z.object({
  projectIdStr: z.string(),
  ticketIdStr: z
    .string()
    .refine((v) => v === "" || /^\d+$/.test(v), { message: "Must be a positive integer" }),
  assigneeId: z.string().min(1, "Assignee is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  ticketId?: number;
  projectId?: number;
}

export function AssignTicketDialog({
  open,
  onOpenChange,
  channelId,
  ticketId,
  projectId,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectIdStr: projectId !== undefined ? String(projectId) : "",
      ticketIdStr: ticketId !== undefined ? String(ticketId) : "",
      assigneeId: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        projectIdStr: projectId !== undefined ? String(projectId) : "",
        ticketIdStr: ticketId !== undefined ? String(ticketId) : "",
        assigneeId: "",
      });
    }
  }, [open, projectId, ticketId, form]);

  const watchedProjectIdStr = form.watch("projectIdStr");

  const effectiveProjectId =
    projectId !== undefined
      ? projectId
      : watchedProjectIdStr
      ? Number(watchedProjectIdStr)
      : 0;

  const { data: projectsData, isLoading: loadingProjects } = useProjects(undefined, {
    enabled: open && projectId === undefined,
  });

  const { data: members, isLoading: loadingMembers } =
    useProjectMembers(effectiveProjectId);

  const assign = useAssignTicketFromChat();

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleProjectChange = useCallback(
    (value: string) => {
      form.setValue("projectIdStr", value);
      form.setValue("ticketIdStr", "");
    },
    [form],
  );

  async function handleSubmit(values: FormValues) {
    const resolvedTicketId =
      ticketId !== undefined
        ? ticketId
        : values.ticketIdStr
        ? Number(values.ticketIdStr)
        : 0;
    const resolvedProjectId =
      projectId !== undefined
        ? projectId
        : values.projectIdStr
        ? Number(values.projectIdStr)
        : 0;

    if (!resolvedProjectId || !resolvedTicketId) {
      toast.error("Fill in all fields");
      return;
    }

    try {
      await assign.mutateAsync({
        channelId,
        ticketId: resolvedTicketId,
        projectId: resolvedProjectId,
        assigneeId: values.assigneeId,
      });
      toast.success("Ticket assigned");
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            {projectId === undefined && (
              <div className="space-y-1.5">
                <Label>
                  Project <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="projectIdStr"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={handleProjectChange}
                      disabled={loadingProjects}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingProjects ? "Loading…" : "Select project"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsData?.data.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.key} — {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.projectIdStr && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.projectIdStr.message}
                  </p>
                )}
              </div>
            )}
            {ticketId === undefined && (
              <div className="space-y-1.5">
                <Label>
                  Ticket <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={form.control}
                  name="ticketIdStr"
                  render={({ field }) => (
                    <TicketCombobox
                      projectId={effectiveProjectId}
                      value={field.value ? Number(field.value) : null}
                      onChange={(id) => field.onChange(String(id))}
                    />
                  )}
                />
                {form.formState.errors.ticketIdStr && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.ticketIdStr.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                Assignee <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingMembers || effectiveProjectId === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingMembers ? "Loading…" : "Select member"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.assigneeId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.assigneeId.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={assign.isPending} loadingText="Assigning…">
                Assign
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
