"use client";

import { Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CsvUploadStepUploadProps {
  onBrowseClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
}

export function CsvUploadStepUpload({
  onBrowseClick,
  onDragOver,
  onDrop,
  onFileInputChange,
  onDownloadTemplate,
}: CsvUploadStepUploadProps) {
  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors"
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">Drop your file here</p>
        <p className="text-xs text-muted-foreground mb-3">
          Supports .csv, .xlsx, and .xls
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          id="lead-file-upload"
          aria-label="Upload leads file"
          onChange={onFileInputChange}
        />
        <Button variant="outline" size="sm" onClick={onBrowseClick}>
          <FileText className="h-4 w-4 mr-2" />
          Browse Files
        </Button>
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          Required: <code className="text-foreground">name</code>.
          Optional: email, phone, company, source, city, designation, priority, notes
        </p>
        <Button variant="ghost" size="sm" onClick={onDownloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Template
        </Button>
      </div>
    </div>
  );
}
