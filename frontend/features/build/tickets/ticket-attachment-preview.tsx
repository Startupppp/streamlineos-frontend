"use client";

import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { XIcon } from "@animateicons/react/lucide";
import { FileText, File } from "lucide-react";

export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

interface AttachmentPreviewProps {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}

export function AttachmentPreview({
  file,
  previewUrl,
  onRemove,
}: AttachmentPreviewProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const isImage = isImageMime(file.type);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-10 w-10 rounded object-cover shrink-0 border border-border"
        />
      ) : (
        <div className="h-10 w-10 rounded border border-border bg-muted flex items-center justify-center shrink-0">
          {file.type === "application/pdf" ? (
            <FileText className="h-5 w-5 text-status-danger-ink" />
          ) : (
            <File className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium" title={file.name}>{file.name}</p>
        <p className="text-micro text-muted-foreground">
          {formatBytes(file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
        {...hoverHandlers}
      >
        <XIcon ref={iconRef} size={14} />
      </button>
    </div>
  );
}
