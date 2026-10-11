"use client";

import { useRef, useCallback, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  MAX_FILE_BYTES,
  ALLOWED_ATTACHMENT_MIME_TYPES,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  isImageMime,
} from "./ticket-attachment-preview";

function isAllowedAttachment(file: File): boolean {
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) return true;
  if (file.type !== "") return false;
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 && ALLOWED_ATTACHMENT_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

interface UseTicketFileDropProps {
  files: File[];
  addFiles: (files: File[]) => void;
  handleRemoveFile: (idx: number) => void;
}

export function useTicketFileDrop({ files, addFiles, handleRemoveFile }: UseTicketFileDropProps) {
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const commitUrls = useEffectEvent((urls: (string | null)[]) => {
    setPreviewUrls(urls);
  });

  useEffect(() => {
    const urls = files.map((f) => {
      if (isImageMime(f.type)) return URL.createObjectURL(f);
      return null;
    });
    commitUrls(urls);
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [files]);

  const validateAndAddFiles = useCallback(
    (selected: File[]) => {
      const disallowed = selected.find((f) => !isAllowedAttachment(f));
      if (disallowed) {
        const msg = `${disallowed.name} is not an allowed file type.`;
        setFileError(msg);
        toast.error(msg);
        return;
      }
      const nextCount = files.length + selected.length;
      if (nextCount > MAX_FILES) {
        const msg = `You can upload up to ${MAX_FILES} files per ticket.`;
        setFileError(msg);
        toast.error(msg);
        return;
      }
      const oversized = selected.find((f) => f.size > MAX_FILE_BYTES);
      if (oversized) {
        const mb = MAX_FILE_BYTES / (1024 * 1024);
        const msg = `${oversized.name} exceeds the ${mb}MB per-file limit.`;
        setFileError(msg);
        toast.error(msg);
        return;
      }
      const currentTotal = files.reduce((sum, f) => sum + f.size, 0);
      const newTotal = selected.reduce((sum, f) => sum + f.size, currentTotal);
      if (newTotal > MAX_TOTAL_BYTES) {
        const msg = "Total attachments exceed the 100MB limit.";
        setFileError(msg);
        toast.error(msg);
        return;
      }
      setFileError(null);
      addFiles(selected);
    },
    [files, addFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      e.target.value = "";
      validateAndAddFiles(selected);
    },
    [validateAndAddFiles],
  );

  const handleRemoveFileWithPreview = useCallback(
    (idx: number) => {
      handleRemoveFile(idx);
    },
    [handleRemoveFile],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) validateAndAddFiles(dropped);
    },
    [validateAndAddFiles],
  );

  return {
    previewUrls,
    fileError,
    handleFileChange,
    handleRemoveFileWithPreview,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
