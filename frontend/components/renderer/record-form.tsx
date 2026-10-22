"use client";

import { useMemo, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import type { FieldSpec, RecordLayout } from "@/lib/renderer/layout";
import {
  defaultValuesForLayout,
  formFields,
  isFieldVisible,
  isLineRows,
  scalarValue,
  schemaForLayout,
  visibleFormValues,
  type FormMode,
  type RecordFormShape,
  type RecordLine,
} from "@/lib/renderer/layout-schema";
import { cn } from "@/lib/utils";
import { RecordLines, type LineFieldControl } from "./record-lines";
import { controlType } from "./control-type";

export type RecordFormValues = Record<string, string>;

export type RecordFormLines = Record<string, RecordLine[]>;

const EMPTY_VALUES: RecordFormShape = {};

export interface RecordFieldControl {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface RecordFormProps<T extends Record<string, unknown> = Record<string, unknown>> {
  layout: RecordLayout;
  initial?: T;
  onSubmit: (
    values: RecordFormValues,
    event?: BaseSyntheticEvent,
    lines?: RecordFormLines,
  ) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  className?: string;
  mode?: FormMode;
  controls?: Record<string, (control: RecordFieldControl) => ReactNode>;
  lineControls?: Record<string, (control: LineFieldControl, index: number) => ReactNode>;
}

function booleanFieldChange(
  onChange: (value: string) => void,
): (checked: boolean) => void {
  return function handleBooleanFieldChange(checked) {
    onChange(String(checked));
  };
}

function lineControlsFor(
  supplied: RecordFormProps["lineControls"],
  name: string,
): Record<string, (control: LineFieldControl, index: number) => ReactNode> | undefined {
  if (!supplied) return undefined;
  const prefix = `${name}.`;
  const own: Record<string, (control: LineFieldControl, index: number) => ReactNode> = {};
  for (const [key, render] of Object.entries(supplied))
    if (key.startsWith(prefix)) own[key.slice(prefix.length)] = render;
  return Object.keys(own).length > 0 ? own : undefined;
}

export function RecordForm<T extends Record<string, unknown> = Record<string, unknown>>({
  layout,
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  className,
  mode = "edit",
  controls,
  lineControls,
}: RecordFormProps<T>) {
  const schema = useMemo(() => schemaForLayout(layout, mode, initial), [layout, mode, initial]);
  const fields = useMemo(() => formFields(layout, mode), [layout, mode]);

  const form = useForm<RecordFormShape>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesForLayout(layout, initial, mode),
  });

  const conditional = fields.some((field) => field.visibleWhen);
  const watched = conditional ? form.watch() : EMPTY_VALUES;

  const values = useMemo(() => ({ ...initial, ...watched }), [initial, watched]);

  const byName = new Map(
    fields.filter((field) => isFieldVisible(field, values)).map((field) => [field.name, field]),
  );

  function handleSubmit(submitted: RecordFormShape, event?: BaseSyntheticEvent): void {
    const kept = visibleFormValues(layout, mode, submitted, { ...initial, ...submitted });

    const scalars: RecordFormValues = {};
    const rows: RecordFormLines = {};
    for (const [name, held] of Object.entries(kept)) {
      if (isLineRows(held)) rows[name] = held;
      else scalars[name] = scalarValue(held);
    }

    onSubmit(scalars, event, rows);
  }

  if (byName.size === 0)
    return (
      <div className={cn("flex min-w-0 flex-col gap-gap-toolbar", className)}>
        <p className="text-dense text-muted-foreground">
          Nothing to fill in — every field on this form is hidden by your
          organisation&rsquo;s layout for {layout.plural.toLowerCase()}.
        </p>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
        ) : null}
      </div>
    );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        noValidate
        className={cn("flex min-w-0 flex-col gap-gap-section", className)}
      >
        {layout.form.sections.map((section) => {
          const sectionFields = section.fields
            .map((name) => byName.get(name))
            .filter((field): field is FieldSpec => field !== undefined);

          if (sectionFields.length === 0) return null;

          return (
            <div key={section.title} className="flex flex-col gap-gap-toolbar">
              
              {section.title ? (
                <h3 className="text-label font-medium text-muted-foreground">{section.title}</h3>
              ) : null}

              <div className="grid grid-cols-1 gap-gap-toolbar sm:grid-cols-2">
                {sectionFields.map((field) =>
                  field.kind === "lines" ? (
                    <FormItem key={field.name} className="sm:col-span-2">
                      <FormLabel>
                        {field.label}
                        {field.required ? <span aria-hidden="true"> *</span> : null}
                      </FormLabel>
                      <RecordLines
                        field={field}
                        disabled={isSubmitting}
                        controls={lineControlsFor(lineControls, field.name)}
                      />
                      {field.hint ? <FormDescription>{field.hint}</FormDescription> : null}
                      <FormMessage />
                    </FormItem>
                  ) : (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: bound }) => {
                      const control = {
                        ...bound,
                        value: scalarValue(bound.value),
                      };
                      return (
                      <FormItem className={cn(field.kind === "longText" && "sm:col-span-2")}>
                        <FormLabel>
                          {field.label}
                          {field.required ? <span aria-hidden="true"> *</span> : null}
                        </FormLabel>

                        {controls?.[field.name] ? (
                          <FormControl>
                            <div>
                              {controls[field.name]({
                                value: control.value,
                                onChange: control.onChange,
                                disabled: isSubmitting,
                              })}
                            </div>
                          </FormControl>
                        ) : field.kind === "boolean" ? (
                          <FormControl>
                            <Switch
                              checked={control.value === "true"}
                              disabled={isSubmitting}
                              onCheckedChange={booleanFieldChange(control.onChange)}
                              aria-label={field.label}
                            />
                          </FormControl>
                        ) : field.kind === "select" || field.kind === "badge" ? (
                          <Select value={control.value} onValueChange={control.onChange}>
                            
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.kind === "date" ? (
                          <FormControl>
                            <DatePicker
                              value={control.value ?? ""}
                              onChange={control.onChange}
                              ariaLabel={field.label}
                              placeholder="Pick a date"
                              dateFormat="dd MMM yyyy"
                              clearable={!field.required}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        ) : (
                          <FormControl>
                            {field.kind === "longText" ? (
                              <Textarea rows={4} {...control} />
                            ) : (
                              <Input type={controlType(field.kind)} {...control} />
                            )}
                          </FormControl>
                        )}

                        {field.hint ? <FormDescription>{field.hint}</FormDescription> : null}
                        <FormMessage />
                      </FormItem>
                      );
                    }}
                  />
                  ),
                )}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-gap-field">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
          <LoadingButton type="submit" isPending={isSubmitting}>
            {submitLabel ?? `Save ${layout.singular.toLowerCase()}`}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
