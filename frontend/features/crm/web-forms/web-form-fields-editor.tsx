"use client";

import { useCallback } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EMPTY_FIELD, FIELD_TYPES, FIELD_TYPE_LABEL, type WebFormValues } from "./web-form-schema";

interface WebFormFieldsEditorProps {
  form: UseFormReturn<WebFormValues>;
}

export function WebFormFieldsEditor({ form }: WebFormFieldsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "fields" });
  const handleAdd = useCallback(() => append(EMPTY_FIELD), [append]);
  const handleRemove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => remove(Number(event.currentTarget.dataset.index)),
    [remove],
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Fields</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add field
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Fields named name, email, phone, company or message fill the lead itself; the rest are kept with it.
      </p>
      {fields.map((row, index) => (
        <div
          key={row.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface-inset p-3 dark:border-background"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`fields.${index}.label`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. company" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`fields.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Field type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {FIELD_TYPE_LABEL[type]}
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
              name={`fields.${index}.required`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 self-end">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Required" />
                  </FormControl>
                  <FormLabel className="!mt-0">Required</FormLabel>
                </FormItem>
              )}
            />
          </div>
          {form.watch(`fields.${index}.type`) === "select" ? (
            <FormField
              control={form.control}
              name={`fields.${index}.options`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choices</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Small, Medium, Large" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-index={index}
              onClick={handleRemove}
              disabled={fields.length === 1}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Remove field
            </Button>
          </div>
        </div>
      ))}
      <FormField control={form.control} name="fields" render={() => <FormMessage />} />
    </section>
  );
}
