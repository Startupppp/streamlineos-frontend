"use client";

import { useCallback } from "react";
import { type Control } from "react-hook-form";
import {
  optionSchema,
  createSchema,
  editSchema,
  type CreateForm,
  type EditForm,
} from "./field-row-schema";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion-variants";
import type { CustomFieldDefinition } from "@/hooks/api/crm/custom-fields";

export { optionSchema, createSchema, editSchema };
export type { CreateForm, EditForm };

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
  text: { label: "Text", className: "bg-muted text-muted-foreground border-border" },
  number: { label: "Number", className: "bg-primary/10 text-primary border-primary/20" },
  date: { label: "Date", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  boolean: { label: "Yes/No", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  select: { label: "Select", className: "bg-primary/10 text-primary border-primary/20" },
};

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
                <TruncatedText text={field.label} className="text-sm font-medium" />
                <span className="text-micro text-muted-foreground font-mono">{field.name}</span>
                <Badge variant="outline" className={cn("text-micro px-1.5 py-0.5", typeConfig.className)}>
                  {typeConfig.label}
                </Badge>
                {field.isRequired && (
                  <Badge variant="outline" className="text-micro">
                    Required
                  </Badge>
                )}
                {field.fieldType === "select" && field.options && field.options.length > 0 && (
                  <Badge variant="secondary" className="text-micro">
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
                className="w-7"
                onClick={handleEdit}
                aria-label={`Edit ${field.label}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 text-destructive"
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
              <Input {...field} className="text-xs" placeholder="Label" />
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
              <Input {...field} className="text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="w-8 text-destructive shrink-0"
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
              <Input {...field} className="text-xs" placeholder="Label" />
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
              <Input {...field} className="text-xs" placeholder="Value" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="w-8 text-destructive shrink-0"
        onClick={handleRemove}
        aria-label="Remove option"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
