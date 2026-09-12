"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileUp, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import { downloadBlob } from "@/lib/download-blob";
import { formatCurrency } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useBulkImportContacts,
  useBulkImportDeals,
  useBulkImportLeads,
} from "@/hooks/api/crm/bulk-import";
import {
  matchField,
  requiredFieldOf,
  type BulkEntity,
  type BulkImportResult,
  type BulkRow,
} from "./bulk-import-entities";
import { BulkColumnMapper, SKIP_COLUMN } from "./bulk-column-mapper";
import {
  IMPORT_FILE_ACCEPT,
  ImportFileError,
  isReadableImportFile,
  readImportFile,
  type ImportFileContents,
} from "./import-file";

const PREVIEW_PAGE_SIZE = 20;
const PROBLEMS_SHOWN = 8;

/**
 * Bringing leads, contacts or deals in from a file.
 *
 * One flow for all three, described by `bulk-import-entities.ts`, replacing
 * three near-identical `<Dialog>` wizards whose steps a person lost by pressing
 * Escape. The steps are gone rather than moved: every stage is a card on the
 * page at once, and the rows below are derived from the file and the current
 * mapping rather than committed to at a "confirm mapping" step, so correcting a
 * column is a change and not a retreat.
 */
export function BulkImportSection({ entity }: { entity: BulkEntity }) {
  const [contents, setContents] = useState<ImportFileContents | null>(null);
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [isReading, setIsReading] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(true);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const importLeads = useBulkImportLeads();
  const importContacts = useBulkImportContacts();
  const importDeals = useBulkImportDeals();
  const bulkImport =
    entity.id === "leads" ? importLeads : entity.id === "contacts" ? importContacts : importDeals;

  const { rows, problems } = useMemo(
    () => planRows(entity, contents, mappings),
    [entity, contents, mappings],
  );

  const required = requiredFieldOf(entity);
  const hasRequired = Object.values(mappings).includes(required.key);
  const tooMany = rows.length > entity.maxRows;
  const [singular, plural] = entity.noun;

  const preview: PreviewRow[] = rows.map((row, index) => ({ ...row, _line: index }));
  const columns = useMemo(() => previewColumns(entity), [entity]);

  const openFile = useCallback(
    async (file: File) => {
      // Cleared up front so a rejected file leaves nothing behind rather than
      // leaving the previous one staged under the new one's name.
      setContents(null);
      setMappings({});
      setResult(null);
      setIsReading(true);

      try {
        const opened = await readImportFile(file);
        const guesses: Record<number, string> = {};
        opened.headers.forEach((header, index) => {
          guesses[index] = matchField(entity, header) ?? SKIP_COLUMN;
        });
        setContents(opened);
        setMappings(guesses);
      } catch (error) {
        toast.error(error instanceof ImportFileError ? error.message : getErrorMessage(error));
      } finally {
        setIsReading(false);
      }
    },
    [entity],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file) return;
      if (!isReadableImportFile(file.name)) {
        toast.error("Drop a .csv or .xlsx file.");
        return;
      }
      void openFile(file);
    },
    [openFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => event.preventDefault(), []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void openFile(file);
    },
    [openFile],
  );

  const handleMappingChange = useCallback(
    (index: number, field: string) => setMappings((current) => ({ ...current, [index]: field })),
    [],
  );

  const handleTemplate = useCallback(
    () =>
      downloadBlob(
        new Blob([entity.template], { type: "text/csv" }),
        `${entity.id}-template.csv`,
      ),
    [entity],
  );

  const handleAutoDistributeChange = useCallback(
    (checked: boolean | "indeterminate") => setAutoDistribute(checked === true),
    [],
  );

  const handleImport = useCallback(() => {
    if (rows.length === 0 || tooMany) return;
    bulkImport.mutate(
      entity.body(rows, autoDistribute),
      {
        onSuccess: (imported) => {
          setResult(imported);
          toast.success(entity.summarise(imported));
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [rows, tooMany, autoDistribute, bulkImport, entity]);

  const handleStartOver = useCallback(() => {
    setContents(null);
    setMappings({});
    setResult(null);
  }, []);

  return (
    <div className="flex flex-col gap-gap-section">
      <Card>
        <CardHeader>
          <CardTitle>Your file</CardTitle>
          <CardDescription>
            A CSV or Excel export of your {plural}. Nothing is written until you say so on the
            review below.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-gap-toolbar">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="rounded-md border border-dashed border-border p-6 text-center transition-colors hover:border-ring"
          >
            <FileUp className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
            <Label
              htmlFor={`bulk-file-${entity.id}`}
              className="justify-center text-label font-medium"
            >
              Drop your file here, or choose one
            </Label>
            <input
              id={`bulk-file-${entity.id}`}
              type="file"
              accept={IMPORT_FILE_ACCEPT}
              className="mx-auto mt-2 block w-full max-w-sm text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
              onChange={handleFileInputChange}
            />
            <p className="mt-2 text-micro text-muted-foreground">.csv or .xlsx</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-gap-field">
            <p className="text-micro text-muted-foreground">
              Needs a {required.label} column. Everything else is optional:{" "}
              {entity.fields
                .filter((field) => !field.required)
                .map((field) => field.label)
                .join(", ")}
              .
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={handleTemplate}>
              <Download className="mr-1.5 size-4" aria-hidden />
              Template
            </Button>
          </div>

          {/* A file being read is not a file that came back empty; saying which
              is the difference between a slow import and one that looks broken. */}
          {isReading ? (
            <p aria-live="polite" className="text-label text-muted-foreground">
              Reading your file…
            </p>
          ) : contents ? (
            <p className="text-label text-muted-foreground">
              {contents.filename} — {contents.rows.length}{" "}
              {contents.rows.length === 1 ? "row" : "rows"}, {contents.headers.length} columns
            </p>
          ) : null}

          {contents && contents.rows.length === 0 ? (
            <p role="alert" className={cn("text-label", statusToneClasses("warning").ink)}>
              That file has a header row and nothing under it, so there is nothing to import.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {contents && contents.rows.length > 0 && !result ? (
        <>
          <BulkColumnMapper
            entity={entity}
            headers={contents.headers}
            sample={contents.rows[0]}
            mappings={mappings}
            onChange={handleMappingChange}
          />

          <Card>
            <CardHeader>
              <CardTitle>What this would do</CardTitle>
              <CardDescription>
                {hasRequired
                  ? `${rows.length} ${rows.length === 1 ? singular : plural} would be created from this file, and nothing else.`
                  : `Point a column at ${required.label} above to see what would happen.`}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-gap-toolbar">
              {problems.length > 0 ? (
                <div className="rounded-md border border-status-warning-rule bg-status-warning-surface p-3">
                  <p className={cn("text-label font-medium", statusToneClasses("warning").ink)}>
                    {problems.length} {problems.length === 1 ? "line needs" : "lines need"} your
                    attention
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {problems.slice(0, PROBLEMS_SHOWN).map((problem) => (
                      <li key={problem} className="text-micro text-muted-foreground">
                        {problem}
                      </li>
                    ))}
                    {problems.length > PROBLEMS_SHOWN ? (
                      <li className="text-micro text-muted-foreground">
                        …and {problems.length - PROBLEMS_SHOWN} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {rows.length > 0 ? (
                <DataTable
                  data={preview}
                  columns={columns}
                  getRowKey={getPreviewRowKey}
                  pagination={{ pageSize: PREVIEW_PAGE_SIZE }}
                />
              ) : null}

              {tooMany ? (
                <p role="alert" className={cn("text-label", statusToneClasses("danger").ink)}>
                  This file has {rows.length} {plural} and {entity.maxRows} is the most that can go
                  in one import. Split it and bring the parts in one after another.
                </p>
              ) : null}

              {entity.option ? (
                <Label
                  htmlFor={`bulk-option-${entity.id}`}
                  className="items-start gap-2.5 rounded-md border border-border p-3"
                >
                  <Checkbox
                    id={`bulk-option-${entity.id}`}
                    checked={autoDistribute}
                    onCheckedChange={handleAutoDistributeChange}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-label font-medium">{entity.option.label}</span>
                    <span className="block text-micro font-normal text-muted-foreground">
                      {entity.option.hint}
                    </span>
                  </span>
                </Label>
              ) : null}

              <LoadingButton
                type="button"
                className="self-start"
                isPending={bulkImport.isPending}
                disabled={rows.length === 0 || tooMany}
                onClick={handleImport}
              >
                <Upload className="mr-1.5 size-4" aria-hidden />
                Import {rows.length} {rows.length === 1 ? singular : plural}
              </LoadingButton>
            </CardContent>
          </Card>
        </>
      ) : null}

      {result ? (
        <Card className="border-status-success-rule">
          <CardHeader>
            <CardTitle>Imported</CardTitle>
            <CardDescription>{entity.summarise(result)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-gap-toolbar">
            {result.errors && result.errors.length > 0 ? (
              <ul className="flex flex-col gap-0.5">
                {result.errors.slice(0, PROBLEMS_SHOWN).map((error) => (
                  <li
                    key={`${error.row}-${error.message}`}
                    className="text-micro text-muted-foreground"
                  >
                    Line {error.row}: {error.message}
                  </li>
                ))}
                {result.errors.length > PROBLEMS_SHOWN ? (
                  <li className="text-micro text-muted-foreground">
                    …and {result.errors.length - PROBLEMS_SHOWN} more
                  </li>
                ) : null}
              </ul>
            ) : null}

            {/* Said plainly rather than offered as a button: unlike the party
                import, these endpoints have nothing to undo with. */}
            <p className="text-label text-muted-foreground">
              This one cannot be taken back from here. Remove anything you did not mean to import
              from the {entity.label.toLowerCase()} list.
            </p>

            <Button type="button" variant="outline" className="self-start" onClick={handleStartOver}>
              Import another file
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * The rows this file would produce, and everything wrong with it.
 *
 * Derived from the file and the current mapping rather than held in state, so
 * the review can never describe a mapping the person has already changed.
 */
function planRows(
  entity: BulkEntity,
  contents: ImportFileContents | null,
  mappings: Record<number, string>,
): { rows: BulkRow[]; problems: string[] } {
  if (!contents) return { rows: [], problems: [] };

  const columnOf = new Map<string, number>();
  for (const [index, field] of Object.entries(mappings))
    if (field !== SKIP_COLUMN) columnOf.set(field, Number(index));

  // Without the required column every row would report the same missing field.
  if (!columnOf.has(requiredFieldOf(entity).key)) return { rows: [], problems: [] };

  const rows: BulkRow[] = [];
  const problems: string[] = [];

  contents.rows.forEach((cells, index) => {
    // The line number in the person's own spreadsheet: the header is line 1.
    const line = index + 2;
    const cell = (field: string) => {
      const column = columnOf.get(field);
      const value = column === undefined ? undefined : cells[column]?.trim();
      return value ? value : undefined;
    };

    const built = entity.build(cell);
    if ("error" in built) {
      problems.push(`Line ${line}: ${built.error} — not imported`);
      return;
    }

    for (const note of built.notes ?? []) problems.push(`Line ${line}: ${note}`);
    rows.push(built.row);
  });

  return { rows, problems };
}

type PreviewRow = BulkRow & { _line: number };

function getPreviewRowKey(row: PreviewRow): number {
  return row._line;
}

function previewColumns(entity: BulkEntity): DataTableColumn<PreviewRow>[] {
  return entity.columns.map((column) => ({
    key: column.key,
    header: column.header,
    className: column.kind === "money" ? "text-right font-mono tabular-nums" : undefined,
    headerClassName: column.kind === "money" ? "text-right" : undefined,
    cell: (row) => {
      const value = row[column.key];
      if (value === undefined || value === "")
        return <span className="text-label text-muted-foreground">—</span>;

      if (column.kind === "money" && typeof value === "number")
        return <span className="text-label">{formatCurrency(value)}</span>;

      const text = Array.isArray(value) ? value.join(", ") : String(value);

      if (column.kind === "badge")
        return (
          <Badge variant="outline" className="text-micro">
            {text}
          </Badge>
        );

      return <span className="block truncate text-label">{text}</span>;
    },
  }));
}

