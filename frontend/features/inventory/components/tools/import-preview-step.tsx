"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { ImportPreviewResult } from "@/hooks/api/inventory/admin";
import type { ImportType } from "./import-type-step";

interface ImportPreviewStepProps {
  importType: ImportType;
  isPreviewing: boolean;
  preview: ImportPreviewResult | null;
  onUpload: (file: File) => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

type PreviewRow = Record<string, unknown> & { _idx: number };

type ErrorRow = { row: number | string; field: string; message: string; _idx: number };

export function ImportPreviewStep({
  importType,
  isPreviewing,
  preview,
  onUpload,
  onConfirm,
  isConfirming,
}: ImportPreviewStepProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  const previewData: PreviewRow[] = React.useMemo(() => {
    if (!preview) return [];
    return preview.sample.slice(0, 5).map((row, i) => ({ ...(row as Record<string, unknown>), _idx: i }));
  }, [preview]);

  const previewColumns: DataTableColumn<PreviewRow>[] = React.useMemo(() => {
    if (!preview) return [];
    return preview.columns.map((col) => ({
      key: col,
      header: col,
      className: "text-xs",
      cell: (row) => String(row[col] ?? ""),
    }));
  }, [preview]);

  const errorData: ErrorRow[] = React.useMemo(() => {
    if (!preview) return [];
    return preview.errors.map((e, i) => ({ ...e, _idx: i }));
  }, [preview]);

  const errorColumns: DataTableColumn<ErrorRow>[] = [
    {
      key: "row",
      header: "Row",
      className: "text-xs text-red-700 dark:text-red-400",
      cell: (e) => e.row,
    },
    {
      key: "field",
      header: "Field",
      className: "text-xs text-red-700 dark:text-red-400",
      cell: (e) => e.field,
    },
    {
      key: "message",
      header: "Message",
      className: "text-xs text-red-700 dark:text-red-400",
      cell: (e) => e.message,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
        <AnimatedIconButton
          type="button"
          icon={UploadIcon}
          iconSize={16}
          iconClassName="mr-1"
          variant="outline"
          onClick={handleBrowseClick}
          disabled={isPreviewing}
          className="gap-2"
        >
          {isPreviewing ? "Uploading…" : "Select file (.csv, .xlsx)"}
        </AnimatedIconButton>
        <span className="text-xs text-muted-foreground">
          Importing: <strong>{importType}</strong>
        </span>
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              {preview.validRows} valid row{preview.validRows !== 1 ? "s" : ""}
            </Badge>
            {preview.errors.length > 0 && (
              <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 gap-1 dark:text-red-300 dark:border-red-500/30 dark:bg-red-500/10">
                <AlertCircle className="h-3 w-3" />
                {preview.errors.length} error{preview.errors.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {preview.sample.length > 0 && (
            <DataTable
              data={previewData}
              columns={previewColumns}
              getRowKey={(row) => row._idx}
            />
          )}

          {preview.errors.length > 0 && (
            <DataTable
              data={errorData}
              columns={errorColumns}
              getRowKey={(e) => e._idx}
            />
          )}

          <Button
            onClick={onConfirm}
            disabled={isConfirming || preview.errors.length > 0 || preview.validRows === 0}
          >
            {isConfirming ? "Starting import…" : `Import ${preview.validRows} rows`}
          </Button>
        </div>
      )}
    </div>
  );
}
