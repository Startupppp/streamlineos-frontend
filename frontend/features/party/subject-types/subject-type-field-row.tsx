"use client";

import { useFieldArray, type Control, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FIELD_KINDS,
  OPTION_KINDS,
  labelToName,
  type SubjectTypeForm,
} from "./subject-type-schema";

interface OptionRowsProps {
  control: Control<SubjectTypeForm>;
  fieldIndex: number;
}

function OptionRows({ control, fieldIndex }: OptionRowsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `fields.${fieldIndex}.options`,
  });

  function handleAdd() {
    append({ value: "", label: "" });
  }

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <FormLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Options
      </FormLabel>

      {fields.map((option, optionIndex) => (
        <div key={option.id} className="flex items-start gap-2">
          <FormField
            control={control}
            name={`fields.${fieldIndex}.options.${optionIndex}.label`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Freehold" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`fields.${fieldIndex}.options.${optionIndex}.value`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="FREEHOLD" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-9 shrink-0"
            aria-label="Remove option"
            onClick={() => remove(optionIndex)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAdd}>
        <Plus className="mr-1 h-3 w-3" /> Add option
      </Button>
    </div>
  );
}

export interface SubjectTypeFieldRowProps {
  form: UseFormReturn<SubjectTypeForm>;
  index: number;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

/**
 * One declared field.
 *
 * The machine name is derived from the label rather than asked for twice, but
 * stays editable: it is the key a tenant's own integrations address, so once a
 * type exists renaming it is a breaking change they have to make deliberately.
 */
export function SubjectTypeFieldRow({ form, index, onRemove, canRemove }: SubjectTypeFieldRowProps) {
  const kind = form.watch(`fields.${index}.kind`);

  function handleLabelChange(value: string) {
    form.setValue(`fields.${index}.label`, value);
    if (!form.getFieldState(`fields.${index}.name`).isDirty)
      form.setValue(`fields.${index}.name`, labelToName(value), { shouldValidate: true });
  }

  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name={`fields.${index}.label`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Label</FormLabel>
            <FormControl>
              <Input
                placeholder="Asking price"
                {...field}
                onChange={(event) => handleLabelChange(event.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`fields.${index}.name`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Machine name</FormLabel>
            <FormControl>
              <Input placeholder="asking-price" className="font-mono text-[13px]" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`fields.${index}.kind`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {FIELD_KINDS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-end justify-between gap-3">
        <FormField
          control={form.control}
          name={`fields.${index}.required`}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Required</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-9"
            aria-label="Remove field"
            onClick={handleRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {OPTION_KINDS.has(kind) ? <OptionRows control={form.control} fieldIndex={index} /> : null}
    </div>
  );
}
