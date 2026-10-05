"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  MAX_FILE_BYTES,
  isImageMime,
} from "./ticket-attachment-preview";

interface UseTicketFileDropProps {
  files: File[];
  addFiles: (files: File[]) => void;
  handleRemoveFile: (idx: number) => void;
}

export function useTicketFileDrop({ files, addFiles, handleRemoveFile }: UseTicketFileDropProps) {
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const urls = files.map((f) => {
      if (isImageMime(f.type)) return URL.createObjectURL(f);
      return null;
    });
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [files]);

  const validateAndAddFiles = useCallback(
    (selected: File[]) => {
      const nextCount = files.length + selected.length;
      if (nextCount > MAX_FILES) {
        setFileError(`You can upload up to ${MAX_FILES} files per ticket.`);
        return;
      }
      const oversized = selected.find((f) => f.size > MAX_FILE_BYTES);
      if (oversized) {
        setFileError(`${oversized.name} exceeds the 25MB per-file limit.`);
        return;
      }
      const currentTotal = files.reduce((sum, f) => sum + f.size, 0);
      const newTotal = selected.reduce((sum, f) => sum + f.size, currentTotal);
      if (newTotal > MAX_TOTAL_BYTES) {
        setFileError("Total attachments exceed the 100MB limit.");
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
