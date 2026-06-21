"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_FILE_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type DocumentInputMode = "url" | "file";

export interface HandbookCreateFormValues {
  version: string;
  title: string;
  changelog: string;
  documentUrl: string;
  documentInputMode: DocumentInputMode;
  selectedFile: File | null;
}

interface HandbookCreateFormProps {
  values: HandbookCreateFormValues;
  onVersionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangelogChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onDocumentUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwitchToUrl: () => void;
  onSwitchToFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function HandbookCreateForm({
  values,
  onVersionChange,
  onTitleChange,
  onChangelogChange,
  onDocumentUrlChange,
  onFileChange,
  onSwitchToUrl,
  onSwitchToFile,
  fileInputRef,
}: HandbookCreateFormProps) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g., 2024 Employee Handbook"
          value={values.title}
          onChange={onTitleChange}
          maxLength={100}
        />
        <p className="text-[11px] text-muted-foreground">
          Min 2 chars, max 100 chars — no consecutive spaces or special characters
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Version <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g., 1.0, v1.0, 2024-01"
          value={values.version}
          onChange={onVersionChange}
          maxLength={20}
        />
        <p className="text-[11px] text-muted-foreground">Format: 1.0, v1.0, 2024-01, 1.0.0-beta</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Document</label>
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            onClick={onSwitchToUrl}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
              values.documentInputMode === "url"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <Link2 className="h-3 w-3" />
            Enter URL
          </button>
          <button
            type="button"
            onClick={onSwitchToFile}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
              values.documentInputMode === "file"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:bg-muted"
            }`}
          >
            <Upload className="h-3 w-3" />
            Upload File
          </button>
        </div>

        {values.documentInputMode === "url" ? (
          <>
            <Input
              placeholder="https://docs.example.com/handbook.pdf"
              value={values.documentUrl}
              onChange={onDocumentUrlChange}
              type="url"
            />
            <p className="text-[11px] text-muted-foreground">Must start with https://</p>
          </>
        ) : (
          <>
            <label
              htmlFor="handbook-file-input"
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md px-4 py-5 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              {values.selectedFile ? (
                <span className="text-xs font-medium text-foreground truncate max-w-full">
                  {values.selectedFile.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Click to select a PDF or DOCX file
                </span>
              )}
            </label>
            <input
              id="handbook-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onFileChange}
              className="sr-only"
            />
            <p className="text-[11px] text-muted-foreground">PDF or DOCX only — max 10MB</p>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Changelog / Notes</label>
        <Textarea
          placeholder="What changed in this version..."
          value={values.changelog}
          onChange={onChangelogChange}
          rows={3}
          maxLength={2000}
        />
      </div>
    </>
  );
}

export { ACCEPTED_FILE_TYPES, ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE };
