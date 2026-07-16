"use client";

import { Link2 } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  const { iconRef: uploadIconRef, hoverHandlers: uploadHoverHandlers } = useAnimatedIcon();

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g., 2024 Employee Handbook"
          value={values.title}
          onChange={onTitleChange}
          maxLength={100}
          className=""
        />
        <p className="text-[11px] text-muted-foreground">
          Min 2 chars, max 100 chars — no consecutive spaces or special characters
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Version <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g., 1.0, v1.0, 2024-01"
          value={values.version}
          onChange={onVersionChange}
          maxLength={20}
          className=""
        />
        <p className="text-[11px] text-muted-foreground">Format: 1.0, v1.0, 2024-01, 1.0.0-beta</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Document</label>
        <div className="rounded-lg border p-1 flex gap-1">
          <button
            type="button"
            onClick={onSwitchToUrl}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors duration-200",
              values.documentInputMode === "url"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Link2 className="h-3 w-3" />
            Enter URL
          </button>
          <button
            type="button"
            onClick={onSwitchToFile}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors duration-200",
              values.documentInputMode === "file"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
            {...uploadHoverHandlers}
          >
            <UploadIcon ref={uploadIconRef} size={12} />
            Upload File
          </button>
        </div>

        {values.documentInputMode === "url" ? (
          <div className="space-y-1.5">
            <Input
              placeholder="https://docs.example.com/handbook.pdf"
              value={values.documentUrl}
              onChange={onDocumentUrlChange}
              type="url"
              className=""
            />
            <p className="text-[11px] text-muted-foreground">Must start with https://</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label
              htmlFor="handbook-file-input"
              className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border px-4 py-6 cursor-pointer hover:bg-muted/40 transition-colors duration-200"
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <UploadIcon size={16} className="text-muted-foreground" />
              </div>
              {values.selectedFile ? (
                <span className="text-xs font-medium text-foreground truncate max-w-full">
                  {values.selectedFile.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground text-center">
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
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Changelog / Notes</label>
        <Textarea
          placeholder="What changed in this version..."
          value={values.changelog}
          onChange={onChangelogChange}
          rows={3}
          maxLength={2000}
          className="resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right">{values.changelog.length}/2000</p>
      </div>
    </div>
  );
}

export { ACCEPTED_FILE_TYPES, ACCEPTED_FILE_EXTENSIONS, MAX_FILE_SIZE };
