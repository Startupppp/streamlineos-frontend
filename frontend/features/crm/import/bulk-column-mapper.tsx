"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { requiredFieldOf, type BulkEntity } from "./bulk-import-entities";

/** A column the person has chosen to leave out. */
export const SKIP_COLUMN = "__skip__";

export interface BulkColumnMapperProps {
  entity: BulkEntity;
  headers: string[];
  /** The first data row, so each choice can be made against a real value. */
  sample: string[] | undefined;
  mappings: Record<number, string>;
  onChange: (index: number, field: string) => void;
}

interface MappingRow {
  index: number;
  header: string;
  example: string | undefined;
  field: string;
}

/**
 * Every column in the file, and where it is going.
 *
 * A card on the page rather than a step in a wizard, and it stays on screen for
 * as long as the file does. The dialogs this replaced made mapping step two of
 * three, so correcting one column after seeing the preview meant going back —
 * and going back is the thing a modal makes expensive. Here the preview below
 * re-reads the file the moment a choice changes, so there is nothing to go back
 * to.
 */
export function BulkColumnMapper({ entity, headers, sample, mappings, onChange }: BulkColumnMapperProps) {
  const required = requiredFieldOf(entity);
  const hasRequired = Object.values(mappings).includes(required.key);

  const rows: MappingRow[] = headers.map((header, index) => ({
    index,
    header,
    example: sample?.[index]?.trim() || undefined,
    field: mappings[index] ?? SKIP_COLUMN,
  }));

  const columns: DataTableColumn<MappingRow>[] = [
    {
      key: "column",
      header: "Column in your file",
      headerClassName: "w-1/2",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-label font-medium">
            {row.header || `Column ${row.index + 1}`}
          </p>
          {row.example ? (
            <p className="truncate text-micro text-muted-foreground">e.g. {row.example}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "field",
      header: "Becomes",
      cell: (row) => (
        <>
          <Label htmlFor={`bulk-column-${row.index}`} className="sr-only">
            What column {row.index + 1} becomes
          </Label>
          <Select value={row.field} onValueChange={(value) => onChange(row.index, value)}>
            <SelectTrigger id={`bulk-column-${row.index}`} className="w-full sm:w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entity.fields.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                  {field.required ? " (required)" : ""}
                </SelectItem>
              ))}
              <SelectItem value={SKIP_COLUMN}>Don&apos;t import this column</SelectItem>
            </SelectContent>
          </Select>
        </>
      ),
    },
  ];

  return (
    <Card className={cn(!hasRequired && "border-status-warning-rule")}>
      <CardHeader>
        <CardTitle>What your columns mean</CardTitle>
        <CardDescription>
          Matched by heading where the heading was recognised. Change any of them — everything
          below re-reads your file as you do.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-gap-field">
        <DataTable data={rows} columns={columns} getRowKey={(row) => row.index} />

        {!hasRequired ? (
          <p role="alert" className={cn("text-label", statusToneClasses("warning").ink)}>
            Point one column at {required.label}. Nothing can be imported without it.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
