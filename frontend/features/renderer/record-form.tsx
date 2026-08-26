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

/**
 * The repeating groups a form carries, by field name.
 *
 * Handed to `onSubmit` beside the record's own values rather than mixed into
 * them, so the twenty-odd surfaces that have no repeating group keep reading
 * `values.name.trim()` without narrowing a union they will never see. A record
 * and its rows are different things; the submit says so.
 */
export type RecordFormLines = Record<string, RecordLine[]>;

/** Stable, so a form with no conditional field never re-memoises on it. */
const EMPTY_VALUES: RecordFormShape = {};

export interface RecordFieldControl {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface RecordFormProps {
  layout: RecordLayout;
  initial?: Record<string, unknown>;
  /**
   * The submit event is forwarded as it always was, so a caller that needs to
   * stop propagation still can. The values it receives are the ones the record
   * is actually on — see `visibleFormValues`.
   *
   * `lines` carries the record's repeating groups, keyed by field name. It is a
   * third parameter rather than a widened first one so that every surface
   * without one is unchanged: a function of two parameters is assignable here,
   * which is what kept twenty-odd migrated sheets from having to narrow a union
   * on every field they read.
   */
  onSubmit: (
    values: RecordFormValues,
    event?: BaseSyntheticEvent,
    lines?: RecordFormLines,
  ) => void;
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
  /**
   * A control for one column of one repeating group, keyed
   * `"<lines field>.<column>"`.
   *
   * Flat rather than nested for the same reason `controls` is: a surface
   * supplies a handful of these and a map of maps would be a shape to remember
   * for no gain. The row index reaches the control, because a quote line's
   * product picker has to know which line it is filling in.
   */
  lineControls?: Record<string, (control: LineFieldControl, index: number) => ReactNode>;
}

/**
 * The controls belonging to one repeating group, re-keyed by column.
 *
 * The prop is flat (`"lineItems.productId"`) so a surface writes one map; the
 * group only wants its own half, keyed the way it addresses a column.
 */
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
  lineControls,
}: RecordFormProps) {
  const schema = useMemo(() => schemaForLayout(layout, mode, initial), [layout, mode, initial]);
  const fields = useMemo(() => formFields(layout, mode), [layout, mode]);

  const form = useForm<RecordFormShape>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesForLayout(layout, initial, mode),
  });

  /*
    Watched whole, because `visibleWhen` makes the form's own shape depend on
    its own values: a validation rule's configuration fields appear when its
    type says they apply. Every field stays registered — only its rendering and
    its checks are conditional — so switching arms and switching back does not
    lose what was typed.
  */
  /*
    `watch()` re-renders the whole form on every keystroke, which is the price of
    a form whose own shape depends on its own values. Only a layout that actually
    declares a condition pays it: without one, nothing here can change what is
    rendered, so there is nothing to watch. It is a method rather than a hook, so
    calling it conditionally is ordinary control flow.
  */
  const conditional = fields.some((field) => field.visibleWhen);
  const watched = conditional ? form.watch() : EMPTY_VALUES;

  /*
    The record's state, not only the form's. A condition can name a field the
    form does not render — a type fixed at creation, a stage a workflow owns —
    and that value is still what decides which arm the record is on. The form's
    own values sit on top, so editing the controlling field takes effect at once.
  */
  const values = useMemo(() => ({ ...initial, ...watched }), [initial, watched]);

  const byName = new Map(
    fields.filter((field) => isFieldVisible(field, values)).map((field) => [field.name, field]),
  );

  /*
    A field from an arm the record is not on is dropped rather than submitted
    empty. Sending it would put a leftover on the record that nobody can see and
    the next reader has to explain.
  */
  function handleSubmit(submitted: RecordFormShape, event?: BaseSyntheticEvent): void {
    const kept = visibleFormValues(layout, mode, submitted, { ...initial, ...submitted });

    /*
      Split at the boundary rather than inside every caller. A record's own
      fields and its repeating groups are different things and go to the API in
      different shapes; handing a surface one map of both would push that
      distinction into twenty sheets that do not have a repeating group.
    */
    const scalars: RecordFormValues = {};
    const rows: RecordFormLines = {};
    for (const [name, held] of Object.entries(kept)) {
      if (isLineRows(held)) rows[name] = held;
      else scalars[name] = scalarValue(held);
    }

    onSubmit(scalars, event, rows);
  }

  /*
    A form with nothing to fill in is said out loud rather than rendered as a
    submit button over no controls. It happens when a tenant has hidden every
    field a narrowed composer writes — rare, and silently posting an empty record
    would be the worse half of that trade.
  */
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
        className={cn("flex min-w-0 flex-col gap-gap-section", className)}
      >
        {layout.form.sections.map((section) => {
          const sectionFields = section.fields
            .map((name) => byName.get(name))
            .filter((field): field is FieldSpec => field !== undefined);

          if (sectionFields.length === 0) return null;

          return (
            <div key={section.title} className="flex flex-col gap-gap-toolbar">
              {/*
                An empty heading is omitted rather than rendered blank: a
                narrowed composer over one field has nothing to head.
              */}
              {section.title ? (
                <h3 className="text-label font-medium text-muted-foreground">{section.title}</h3>
              ) : null}

              <div className="grid grid-cols-1 gap-gap-toolbar sm:grid-cols-2">
                {sectionFields.map((field) =>
                  /*
                    A repeating group owns the full width and its own add and
                    remove controls, so it steps out of the two-column grid
                    rather than being squeezed into half of one.
                  */
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
                          /*
                            A switch rather than a two-item dropdown. The value
                            stays a string like every other control's, so the
                            generated resolver still matches the form's own
                            values without a cast, and the surface converts at
                            the boundary the same way it converts a date.
                          */
                          <FormControl>
                            <Switch
                              checked={control.value === "true"}
                              disabled={isSubmitting}
                              onCheckedChange={(next) => control.onChange(String(next))}
                              aria-label={field.label}
                            />
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
