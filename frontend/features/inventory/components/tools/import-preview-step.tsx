"use client";

import * as React from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <Button
          type="button"
          variant="outline"
          onClick={handleBrowseClick}
          disabled={isPreviewing}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isPreviewing ? "Uploading…" : "Select file (.csv, .xlsx)"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Importing: <strong>{importType}</strong>
        </span>
      </div>

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              {preview.validRows} valid row{preview.validRows !== 1 ? "s" : ""}
            </Badge>
            {preview.errors.length > 0 && (
              <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 gap-1">
                <AlertCircle className="h-3 w-3" />
                {preview.errors.length} error{preview.errors.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {preview.sample.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.map(function renderHead(col) {
                      return <TableHead key={col}>{col}</TableHead>;
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sample.slice(0, 5).map(function renderRow(row, idx) {
                    return (
                      <TableRow key={idx}>
                        {preview.columns.map(function renderCell(col) {
                          return (
                            <TableCell key={col} className="text-xs">
                              {String(row[col] ?? "")}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.errors.map(function renderError(err, idx) {
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-xs text-red-700">{err.row}</TableCell>
                        <TableCell className="text-xs text-red-700">{err.field}</TableCell>
                        <TableCell className="text-xs text-red-700">{err.message}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
