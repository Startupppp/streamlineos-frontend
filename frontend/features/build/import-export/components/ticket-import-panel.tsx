"use client";

import { useCallback, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImportMappingSummary } from "./import-mapping-summary";
import { ImportPreviewOutcome, ImportReportOutcome } from "./import-outcome";
import { useTicketImportFlow } from "../use-ticket-import-flow";
import { importFormatSchema, importModeSchema } from "../import-export-contract";

interface TicketImportPanelProps {
  projectId: number;
}

export function TicketImportPanel({ projectId }: TicketImportPanelProps) {
  const flow = useTicketImportFlow(projectId);
  const { setFormat, setMode, loadFile } = flow;

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  const handleFormatChange = useCallback(
    (value: string) => {
      const parsed = importFormatSchema.safeParse(value);
      if (parsed.success) setFormat(parsed.data);
    },
    [setFormat],
  );

  const handleModeChange = useCallback(
    (value: string) => {
      const parsed = importModeSchema.safeParse(value);
      if (parsed.success) setMode(parsed.data);
    },
    [setMode],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-import-file">File</Label>
          <Input
            id="ticket-import-file"
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-import-format">Format</Label>
          <Select value={flow.format} onValueChange={handleFormatChange}>
            <SelectTrigger id="ticket-import-format" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-import-mode">On failure</Label>
          <Select value={flow.mode} onValueChange={handleModeChange}>
            <SelectTrigger id="ticket-import-mode" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="atomic">Import all or nothing</SelectItem>
              <SelectItem value="partial">Keep the rows that worked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {flow.fileName ? (
        <p className="text-sm text-muted-foreground">
          Reading <span className="font-medium text-foreground">{flow.fileName}</span>
        </p>
      ) : null}

      {flow.content.trim().length > 0 ? (
        <ImportMappingSummary format={flow.format} content={flow.content} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Choose a CSV or JSON file to see how its columns map to ticket fields. Nothing is
          sent until you run the dry run.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <LoadingButton
          type="button"
          variant="outline"
          isPending={flow.isPreviewing}
          loadingText="Checking the file…"
          disabled={!flow.canRunPreview || flow.isCommitting}
          onClick={flow.runPreview}
        >
          Dry run
        </LoadingButton>
        {flow.isPreviewing ? (
          <Button type="button" variant="ghost" size="sm" onClick={flow.cancelPreview}>
            Cancel dry run
          </Button>
        ) : null}
        <LoadingButton
          type="button"
          isPending={flow.isCommitting}
          loadingText="Importing…"
          disabled={!flow.canCommitPreview || flow.isPreviewing}
          onClick={flow.commit}
        >
          {flow.preview
            ? `Import ${flow.preview.summary.importable} rows`
            : "Import"}
        </LoadingButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={flow.isCommitting}
          onClick={flow.reset}
        >
          Start over
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        A dry run writes nothing and can be cancelled. The import itself runs in a single
        request and cannot be interrupted once sent:{" "}
        {flow.mode === "atomic"
          ? "in this mode every row is written or none is."
          : "in this mode the batches that succeed are kept and the rest are reported."}{" "}
        Retrying the same dry run replays the first result instead of importing twice.
      </p>

      {flow.preview ? <ImportPreviewOutcome preview={flow.preview} /> : null}
      {flow.report ? <ImportReportOutcome report={flow.report} /> : null}
    </div>
  );
}
