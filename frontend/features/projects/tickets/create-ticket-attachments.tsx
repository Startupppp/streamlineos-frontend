"use client";

import { Upload } from "lucide-react";

interface CreateTicketAttachmentsProps {
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (idx: number) => void;
}

export function CreateTicketAttachments({
  files,
  onFileChange,
  onRemoveFile,
}: CreateTicketAttachmentsProps) {
  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2.5 border border-border rounded-lg bg-muted/20"
            >
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Remove file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
        <span className="text-xs font-medium text-foreground">
          {files.length > 0 ? "Add more files" : "Click to upload"}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          Images, PDF, DOC, XLS up to 25MB each
        </span>
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          onChange={onFileChange}
        />
      </label>
    </div>
  );
}
