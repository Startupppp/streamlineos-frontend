"use client";

import { useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  schemaForLayout,
  type FormMode,
} from "@/lib/renderer/layout-schema";
import { cn } from "@/lib/utils";

export type RecordFormValues = Record<string, string>;

export interface RecordFieldControl {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface RecordFormProps {
  layout: RecordLayout;
  initial?: Record<string, unknown>;
  onSubmit: (values: RecordFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  className?: string;
  /** Creating drops `editOnly` fields; editing keeps them. */
  mode?: FormMode;
  /**
   * A control for a field the platform's primitives cannot render on their own —
   * a person picker, a record picker. Keyed by field name, and supplied by the
   * surface because who may be picked depends on the caller rather than on the
   * record's shape.
   */
  controls?: Record<string, (control: RecordFieldControl) => ReactNode>;
}

function controlType(kind: FieldSpec["kind"]): string {
  switch (kind) {
    case "email":
      return "email";
    case "phone":
      return "tel";
    case "url":
      return "url";
    case "number":
    case "money":
    case "percent":
      return "number";
    case "date":
      return "date";
    case "dateTime":
      return "datetime-local";
    default:
      return "text";
  }
}

/**
 * A form, rendered from the description.
 *
 * Built on react-hook-form with a resolver generated from the same description
 * that produced the list and detail views, so the three cannot disagree about
 * what a record is. The controls are the platform's own form primitives rather
 * than bespoke inputs — there is one Input, one Select, one FormMessage, and a
 * generated form has no more licence to fork them than a hand-written one.
 */
export function RecordForm({
  layout,
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  className,
  mode = "edit",
  controls,
}: RecordFormProps) {
  const schema = useMemo(() => schemaForLayout(layout, mode), [layout, mode]);
  const fields = useMemo(() => formFields(layout, mode), [layout, mode]);

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesForLayout(layout, initial, mode),
  });

  const byName = new Map(fields.map((field) => [field.name, field]));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex min-w-0 flex-col gap-gap-section", className)}
      >
        {layout.form.sections.map((section) => {
          const sectionFields = section.fields
            .map((name) => byName.get(name))
            .filter((field): field is FieldSpec => field !== undefined);

          if (sectionFields.length === 0) return null;

          return (
            <div key={section.title} className="flex flex-col gap-gap-toolbar">
              <h3 className="text-label font-medium text-muted-foreground">{section.title}</h3>

              <div className="grid grid-cols-1 gap-gap-toolbar sm:grid-cols-2">
                {sectionFields.map((field) => (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: control }) => (
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
                        ) : field.kind === "select" || field.kind === "badge" ? (
                          <Select value={control.value} onValueChange={control.onChange}>
                            {/*
                              FormControl wraps the TRIGGER, not the Select root.
                              It clones its child to attach the id the label
                              points at, and the Radix root renders no element —
                              so wrapping the root left every select in every
                              generated form with a label associated to nothing,
                              for a screen reader as much as for a test.
                            */}
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
                    )}
                  />
                ))}
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
