"use client";

import { useCallback, type ReactNode } from "react";
import { useFieldArray, useFormContext, type FieldValues } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { isNumericField, type FieldSpec } from "@/lib/renderer/layout";
import { blankLine, type RecordLine } from "@/lib/renderer/layout-schema";
import { cn } from "@/lib/utils";
import { controlType } from "./control-type";

/**
 * A repeating group, rendered from the same description that renders the rest.
 *
 * Four surfaces had written this by hand before the description could say it —
 * an assignment rule's conditions, a subject type's declared fields, a quote's
 * line items and the grid beside them — and no two agreed on where the add
 * button went, what an empty row held, or whether the last row could be removed.
 * What is here is the one answer, and it is short precisely because a line's
 * columns are ordinary `FieldSpec`s: the control a column gets is the control
 * that column's kind gets anywhere else.
 *
 * Rows are a labelled stack rather than a table. A five-column table at 375px
 * is a horizontal scroll inside a sheet that is already a scroll, and the phone
 * is where a quote most often gets a line added; a labelled grid reflows
 * instead. The label repeats per row rather than sitting in a header, because a
 * header over columns that have stacked under each other names the wrong thing.
 */

/**
 * The slice of the form this component operates on.
 *
 * `RecordForm` holds one form whose fields are strings *or* rows, and
 * react-hook-form's path types cannot express "the array-valued members of a
 * heterogeneous record" — `FieldArrayPath` of that shape is `never`, so no name
 * is nameable. Reading the shared context as the rows half is narrower than the
 * truth and exactly true of the field this component is given: a `lines` field
 * holds `RecordLine[]` and nothing else. It is a re-typing at one boundary
 * rather than a cast at every call site, and it keeps `record-form.tsx` free of
 * `as`.
 */
interface LinesFormShape extends FieldValues {
  [name: string]: RecordLine[];
}

export interface LineFieldControl {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface RecordLinesProps {
  field: FieldSpec;
  disabled?: boolean;
  /**
   * A control for a column the platform's primitives cannot render on their
   * own — a product picker on a quote line. Keyed by the column's name, and
   * supplied by the surface for the same reason a record's own controls are:
   * who may be picked depends on the caller rather than on the row's shape.
   */
  controls?: Record<string, (control: LineFieldControl, index: number) => ReactNode>;
}

export function RecordLines({ field, disabled, controls }: RecordLinesProps) {
  const { control } = useFormContext<LinesFormShape>();
  const { fields, append, remove } = useFieldArray<LinesFormShape>({ control, name: field.name });

  const minimum = field.minLines ?? (field.required ? 1 : 0);
  const columns = field.lineFields ?? [];
  const singular = (field.lineLabel ?? field.label).toLowerCase();

  const handleAdd = useCallback(() => {
    append(blankLine(field));
  }, [append, field]);

  return (
    <div className="flex min-w-0 flex-col gap-gap-field">
      {fields.map((row, index) => (
        <div
          key={row.id}
          className="flex min-w-0 items-end gap-gap-field rounded-md border border-border bg-card p-card-pad"
        >
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-gap-field sm:grid-cols-2">
            {columns.map((column) => (
              <LineControl
                key={column.name}
                column={column}
                path={`${field.name}.${index}.${column.name}`}
                index={index}
                disabled={disabled}
                render={controls?.[column.name]}
              />
            ))}
          </div>

          {/*
            The last row stays when the record may not go below it. Offering a
            control that produces a record the API rejects is a form that waits
            until submit to say no.
          */}
          {fields.length > minimum ? (
            <RemoveLineButton
              index={index}
              label={`Remove ${singular} ${index + 1}`}
              disabled={disabled}
              onRemove={remove}
            />
          ) : null}
        </div>
      ))}

      <div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handleAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Add {singular}
        </Button>
      </div>
    </div>
  );
}

interface RemoveLineButtonProps {
  index: number;
  label: string;
  disabled?: boolean;
  onRemove: (index: number) => void;
}

function RemoveLineButton({ index, label, disabled, onRemove }: RemoveLineButtonProps) {
  const handleClick = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 text-destructive"
      disabled={disabled}
      aria-label={label}
      onClick={handleClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

/** A leaf path into one row, as a template type so the value at it is a string. */
type LinePath = `${string}.${number}.${string}`;

interface LineControlProps {
  column: FieldSpec;
  path: LinePath;
  index: number;
  disabled?: boolean;
  render?: (control: LineFieldControl, index: number) => ReactNode;
}

/**
 * One column of one row.
 *
 * Deliberately the same ladder `RecordForm` walks for a top-level field, in the
 * same order, so a `select` in a line and a `select` on the record are the same
 * control. What differs is only that the label is quieter and the message sits
 * under the control that earned it rather than at the top of the group — on a
 * five-line quote that is the difference between a fixable error and a form
 * that just says no.
 */
function LineControl({ column, path, index, disabled, render }: LineControlProps) {
  const { control } = useFormContext<LinesFormShape>();

  return (
    <FormField
      control={control}
      name={path}
      render={({ field: bound }) => {
        const value = typeof bound.value === "string" ? bound.value : "";
        const handleChange = (next: string): void => bound.onChange(next);
        const handleCheckedChange = (next: boolean): void => handleChange(String(next));

        return (
          <FormItem className={cn(column.kind === "longText" && "sm:col-span-2")}>
            <FormLabel className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
              {column.label}
              {column.required ? <span aria-hidden="true"> *</span> : null}
            </FormLabel>

            {render ? (
              <FormControl>
                <div>{render({ value, onChange: handleChange, disabled }, index)}</div>
              </FormControl>
            ) : column.kind === "boolean" ? (
              <FormControl>
                <Switch
                  checked={value === "true"}
                  disabled={disabled}
                  onCheckedChange={handleCheckedChange}
                  aria-label={column.label}
                />
              </FormControl>
            ) : column.kind === "select" || column.kind === "badge" ? (
              <Select value={value} onValueChange={handleChange} disabled={disabled}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${column.label.toLowerCase()}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {column.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : column.kind === "longText" ? (
              <FormControl>
                <Textarea rows={2} value={value} onChange={bound.onChange} disabled={disabled} />
              </FormControl>
            ) : (
              <FormControl>
                <Input
                  type={controlType(column.kind)}
                  value={value}
                  onChange={bound.onChange}
                  disabled={disabled}
                  className={cn(isNumericField(column) && "text-right font-mono tabular-nums")}
                />
              </FormControl>
            )}

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
