import { z } from "zod";

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
  value: z.string().optional(),
});

export const actionSchema = z.object({
  type: z.enum(["set_status", "set_assignee", "set_priority", "add_label", "add_comment"]),
  value: z.string().min(1),
});

export const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  triggerEvent: z.string().min(1, "Select a trigger"),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema).min(1, "At least one action required"),
  isActive: z.boolean(),
});

export type FormValues = z.infer<typeof formSchema>;

export const CONDITION_FIELDS = ["status", "priority", "assignee", "label", "type"];
export const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;
export const FIELD_CLASS = "h-8 text-sm";
