"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateTask,
  useUpdateTask,
  type Task,
  type CreateTaskInput,
} from "@/hooks/api/tasks";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum(["CALL", "EMAIL", "MEETING", "DEMO", "FOLLOW_UP", "REMINDER", "CUSTOM"]),
  notes: z.string().optional(),
  entityType: z.enum(["LEAD", "DEAL", "CONTACT"]).optional(),
  entityIdRaw: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

type CrmEntityType = "LEAD" | "DEAL" | "CONTACT";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultEntityType?: CrmEntityType;
  defaultEntityId?: number;
}

export function CreateTaskDialog({ open, onOpenChange, task, defaultEntityType, defaultEntityId }: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const isEditing = !!task;
  const isSubmitting = createTask.isPending || updateTask.isPending;
  const hasPrefilledEntity = !!defaultEntityType && defaultEntityId != null;

  const defaultValues: TaskFormValues = {
    title: task?.title ?? "",
    type: task?.type ?? "CUSTOM",
    notes: task?.notes ?? "",
    entityType: (task?.entityType as TaskFormValues["entityType"]) ?? defaultEntityType ?? undefined,
    entityIdRaw: task?.entityId != null ? String(task.entityId) : defaultEntityId != null ? String(defaultEntityId) : "",
    assigneeId: task?.assigneeId ?? "",
    dueDate: task?.dueDate ?? "",
  };

  const handleSubmit = useCallback(
    (values: TaskFormValues) => {
      const entityId = values.entityIdRaw ? parseInt(values.entityIdRaw, 10) : undefined;
      const entityType = values.entityType;

      if (isEditing && task) {
        updateTask.mutate(
          {
            taskId: task.id,
            input: {
              title: values.title,
              type: values.type,
              notes: values.notes || undefined,
              entityType,
              entityId: !isNaN(entityId ?? NaN) ? entityId : undefined,
              assigneeId: values.assigneeId || undefined,
              dueDate: values.dueDate || undefined,
            },
          },
          {
            onSuccess: () => {
              toast.success("Task updated");
              onOpenChange(false);
            },
            onError: () => toast.error("Failed to update task"),
          },
        );
      } else {
        const input: CreateTaskInput = {
          title: values.title,
          type: values.type,
          notes: values.notes || undefined,
          entityType,
          entityId: !isNaN(entityId ?? NaN) ? entityId : undefined,
          assigneeId: values.assigneeId || undefined,
          dueDate: values.dueDate || undefined,
        };
        createTask.mutate(input, {
          onSuccess: () => {
            toast.success("Task created");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to create task"),
        });
      }
    },
    [isEditing, task, createTask, updateTask, onOpenChange],
  );

  return (
    <EntityFormDialog<TaskFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Task" : "New Task"}
      resolver={zodResolver(taskSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={isEditing ? "Save Changes" : "Create Task"}
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Task title" {...field} />
                </FormControl>
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="DEMO">Demo</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                    <SelectItem value="REMINDER">Reminder</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!hasPrefilledEntity && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="entityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related To</FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LEAD">Lead</SelectItem>
                          <SelectItem value="DEAL">Deal</SelectItem>
                          <SelectItem value="CONTACT">Contact</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entityIdRaw"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 42" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to create a standalone task
              </p>
            </>
          )}

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add notes..." rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
