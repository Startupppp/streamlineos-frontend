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

type LinePath = `${string}.${number}.${string}`;

interface LineControlProps {
  column: FieldSpec;
  path: LinePath;
  index: number;
  disabled?: boolean;
  render?: (control: LineFieldControl, index: number) => ReactNode;
}

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
