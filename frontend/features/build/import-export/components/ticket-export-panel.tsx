"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportTickets } from "@/hooks/api/build/ticket-import-export";
import { downloadTextFile } from "../download-text-file";
import { importFormatSchema, type ImportFormat } from "../import-export-contract";

interface TicketExportPanelProps {
  projectId: number;
}

export function TicketExportPanel({ projectId }: TicketExportPanelProps) {
  const [format, setFormat] = useState<ImportFormat>("csv");
  const exportTickets = useExportTickets(projectId);
  const { mutate } = exportTickets;

  const handleFormatChange = useCallback((value: string) => {
    const parsed = importFormatSchema.safeParse(value);
    if (parsed.success) setFormat(parsed.data);
  }, []);

  const handleExport = useCallback(() => {
    mutate(
      { format },
      {
        onSuccess: (result) => {
          downloadTextFile(result.filename, result.contentType, result.content);
          toast.success(`Exported ${result.rowCount} tickets`);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [format, mutate]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ticket-export-format">Format</Label>
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger id="ticket-export-format" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        The export covers the tickets you are allowed to see in this project, and its columns
        are the ones an import reads back.
      </p>
      <div>
        <LoadingButton
          type="button"
          isPending={exportTickets.isPending}
          loadingText="Preparing the file…"
          onClick={handleExport}
        >
          Export tickets
        </LoadingButton>
      </div>
    </div>
  );
}
