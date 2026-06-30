"use client";

import { useCallback } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
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
import type { LogCrmActivityInput, CrmActivityType, CrmActivityEntityType } from "@/hooks/api/crm/crm-activities";

const ENTITY_TYPE_VALUES = ["LEAD", "DEAL", "CONTACT", ""] as const;
type EntityTypeFieldValue = (typeof ENTITY_TYPE_VALUES)[number];

const logActivitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "CUSTOM"] as const),
  title: z.string().min(1, "Title is required").max(255),
  notes: z.string().optional(),
  entityType: z.enum(ENTITY_TYPE_VALUES).optional(),
  entityId: z.string().optional(),
  dueDate: z.string().optional(),
});

type LogActivityValues = z.infer<typeof logActivitySchema>;

function isCrmEntityType(v: string): v is CrmActivityEntityType {
  return v === "LEAD" || v === "DEAL" || v === "CONTACT";
}

interface LogActivityDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: LogCrmActivityInput) => void;
  isPending: boolean;
}

export function LogActivityDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: LogActivityDialogProps) {
  const handleOpenChange = useCallback(
    (v: boolean) => { if (!v) onClose(); },
    [onClose],
  );

  const handleSubmit = useCallback(
    (data: LogActivityValues) => {
      const rawEntityId = data.entityId?.trim();
      const entityIdNum = rawEntityId ? parseInt(rawEntityId, 10) : undefined;
      const entityTypeRaw: EntityTypeFieldValue = data.entityType ?? "";
      const entityType = isCrmEntityType(entityTypeRaw) ? entityTypeRaw : undefined;

      let dueDateIso: string | undefined;
      if (data.dueDate) {
        dueDateIso = `${data.dueDate}T00:00:00.000Z`;
      }

      onSubmit({
        type: data.type as CrmActivityType,
        title: data.title.trim(),
        notes: data.notes?.trim() || undefined,
        entityType,
        entityId: entityIdNum !== undefined && !isNaN(entityIdNum) ? entityIdNum : undefined,
        dueDate: dueDateIso,
      });
    },
    [onSubmit],
  );

  return (
    <EntityFormDialog<LogActivityValues>
      open={open}
      onOpenChange={handleOpenChange}
      title="Log Activity"
      description="Record a call, email, meeting, or task"
      resolver={zodResolver(logActivitySchema)}
      defaultValues={{
        type: "CALL",
        title: "",
        notes: "",
        entityType: "",
        entityId: "",
        dueDate: "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      resetOnOpen
      submitLabel="Log Activity"
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CALL">Phone Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="CUSTOM">Task / Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Called John about the proposal"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related To</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
              name="entityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity ID</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 42"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
                  <Textarea
                    placeholder="What happened or what needs to be done..."
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
