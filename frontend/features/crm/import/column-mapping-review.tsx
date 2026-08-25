"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  IMPORT_FIELDS,
  IMPORT_FIELD_LABELS,
  type MappedColumn,
} from "@/types/crm/import";

const IGNORE = "__ignore__";

/** What the system decided about a column, in the user's words. */
function describe(column: MappedColumn): { text: string; tone: "success" | "warning" | "neutral" } {
  switch (column.mapping.kind) {
    case "mapped":
      return {
        text: `${IMPORT_FIELD_LABELS[column.mapping.field] ?? column.mapping.field}${
          column.mapping.confidence < 1 ? " (best guess)" : ""
        }`,
        tone: column.mapping.confidence < 1 ? "warning" : "success",
      };
    case "custom":
      // Not a lesser outcome. The column survives and is findable afterwards.
      return { text: "Kept as an extra field", tone: "neutral" };
    case "ambiguous":
      return { text: "Needs an answer", tone: "warning" };
    case "unmapped":
      return { text: "Left alone", tone: "neutral" };
  }
}

export interface ColumnMappingReviewProps {
  columns: MappedColumn[];
  overrides: Record<string, string>;
  onOverride: (header: string, field: string) => void;
}

/**
 * Every column, and what will happen to it.
 *
 * The ambiguous ones are asked about, but all of them are shown and all of them
 * can be changed. A confirmation step that only surfaces the questions leaves a
 * user unable to correct a confident wrong answer, which is the worse failure of
 * the two.
 */
export function ColumnMappingReview({ columns, overrides, onOverride }: ColumnMappingReviewProps) {
  const unanswered = columns.filter((column) => column.mapping.kind === "ambiguous");

  return (
    <Card className={cn(unanswered.length > 0 && "border-status-warning-rule")}>
      <CardHeader>
        <CardTitle>What your columns mean</CardTitle>
        <CardDescription>
          {unanswered.length > 0
            ? `${unanswered.length} ${unanswered.length === 1 ? "column needs" : "columns need"} an answer before this can run. You can change any of the others too.`
            : "Nothing here needs an answer, but you can change any of it."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-gap-field">
        {columns.map((column) => {
          const { text, tone } = describe(column);
          const current = overrides[column.header] ?? "";
          const needsAnswer = column.mapping.kind === "ambiguous";

          return (
            <div
              key={column.header}
              className="flex flex-wrap items-center justify-between gap-gap-field border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <Label htmlFor={`column-${column.header}`} className="text-sm font-medium">
                  {column.header}
                </Label>
                <p className={cn("text-micro", statusToneClasses(tone).ink)}>
                  {current
                    ? current === IGNORE
                      ? "Will be left alone"
                      : `You chose ${IMPORT_FIELD_LABELS[current] ?? current}`
                    : text}
                </p>
              </div>

              <Select
                value={current}
                onValueChange={(value) => onOverride(column.header, value)}
              >
                <SelectTrigger
                  id={`column-${column.header}`}
                  className={cn("w-full sm:w-[200px]", needsAnswer && !current && "border-status-warning-rule")}
                >
                  <SelectValue placeholder={needsAnswer ? "Choose a field" : "Leave as is"} />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_FIELDS.map((field) => (
                    <SelectItem key={field} value={field}>
                      {IMPORT_FIELD_LABELS[field] ?? field}
                    </SelectItem>
                  ))}
                  <SelectItem value={IGNORE}>Don&apos;t import this column</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
