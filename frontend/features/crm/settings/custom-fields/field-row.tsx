"use client";

import { useCallback } from "react";
import { z } from "zod";
import { type Control } from "react-hook-form";
import { motion, useReducedMotion } from "framer-motion";
import { Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion-variants";
import type { CustomFieldDefinition } from "@/hooks/api/crm/custom-fields";

export type EntityType = "lead" | "deal" | "contact";

export const ENTITY_TABS = [
  { value: "lead" as EntityType, label: "Leads" },
  { value: "contact" as EntityType, label: "Contacts" },
  { value: "deal" as EntityType, label: "Deals" },
];

const FIELD_TYPE_CONFIG: Record<
  CustomFieldDefinition["fieldType"],
  { label: string; className: string }
> = {
  text: { label: "Text", className: "bg-slate-100 text-slate-700 border-slate-200" },
  number: { label: "Number", className: "bg-blue-50 text-blue-700 border-blue-200" },
  date: { label: "Date", className: "bg-amber-50 text-amber-700 border-amber-200" },
  boolean: { label: "Yes/No", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  select: { label: "Select", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

export const optionSchema = z.object({
  value: z.string().min(1, "Value required"),
  label: z.string().min(1, "Label required"),
});

export const createSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  fieldType: z.enum(["text", "number", "date", "boolean", "select"]),
  isRequired: z.boolean(),
  options: z.array(optionSchema).optional(),
});
export type CreateForm = z.infer<typeof createSchema>;

export const editSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  isRequired: z.boolean(),
  options: z.array(optionSchema).optional(),
});
export type EditForm = z.infer<typeof editSchema>;

export function labelToName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const REDUCED_ITEM_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

interface FieldRowProps {
  field: CustomFieldDefinition;
  onEdit: (f: CustomFieldDefinition) => void;
  onDeleteRequest: (id: number) => void;
  onToggle: (id: number, entityType: EntityType, currentActive: boolean) => void;
}

export function FieldRow({ field, onEdit, onDeleteRequest, onToggle }: FieldRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? REDUCED_ITEM_VARIANTS : fadeUp;

  const handleEdit = useCallback(() => onEdit(field), [field, onEdit]);
  const handleDelete = useCallback(() => onDeleteRequest(field.id), [field.id, onDeleteRequest]);
  const handleToggle = useCallback(
    () => onToggle(field.id, field.entityType, field.isActive),
    [field.id, field.entityType, field.isActive, onToggle],
  );

  const typeConfig = FIELD_TYPE_CONFIG[field.fieldType];

  return (
    <motion.div variants={variants}>
      <Card
        className={cn(
          "bg-card rounded-lg border border-border shadow-sm transition-all",
          !field.isActive && "opacity-60",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{field.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{field.name}</span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", typeConfig.className)}>
                  {typeConfig.label}
                </Badge>
                {field.isRequired && (
                  <Badge variant="outline" className="text-[10px]">
                    Required
                  </Badge>
                )}
                {field.fieldType === "select" && field.options && field.options.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {field.options.length} options
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={field.isActive}
                onCheckedChange={handleToggle}
                aria-label={`Toggle ${field.label}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleEdit}
                aria-label={`Edit ${field.label}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={handleDelete}
                aria-label={`Delete ${field.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CreateOptionRowProps {
  index: number;
  control: Control<CreateForm>;
  onRemove: (i: number) => void;
}

export function CreateOptionRow({ index, control, onRemove }: CreateOptionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  return (
    <div className="flex items-center gap-2">
      <FormField
        control={control}
        name={`options.${index}.label`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Label" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`options.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive shrink-0"
        onClick={handleRemove}
        aria-label="Remove option"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface EditOptionRowProps {
  index: number;
  control: Control<EditForm>;
  onRemove: (i: number) => void;
}

export function EditOptionRow({ index, control, onRemove }: EditOptionRowProps) {
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);
  return (
    <div className="flex items-center gap-2">
      <FormField
        control={control}
        name={`options.${index}.label`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Label" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`options.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input {...field} className="h-8 text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive shrink-0"
        onClick={handleRemove}
        aria-label="Remove option"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
