"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCommitTicketImport,
  usePreviewTicketImport,
} from "@/hooks/api/build/ticket-import-export";
import { canCommit } from "./import-preview-model";
import type {
  ImportFormat,
  ImportMode,
  TicketImportPreview,
  TicketImportReport,
} from "./import-export-contract";

export const IMPORT_MAX_CONTENT_BYTES = 2_000_000;

export interface TicketImportFlow {
  fileName: string | null;
  format: ImportFormat;
  content: string;
  mode: ImportMode;
  preview: TicketImportPreview | null;
  report: TicketImportReport | null;
  isPreviewing: boolean;
  isCommitting: boolean;
  canRunPreview: boolean;
  canCommitPreview: boolean;
  setFormat: (format: ImportFormat) => void;
  setMode: (mode: ImportMode) => void;
  setContent: (content: string, fileName?: string) => void;
  loadFile: (file: File) => Promise<void>;
  runPreview: () => void;
  cancelPreview: () => void;
  commit: () => void;
  reset: () => void;
}

function formatForFileName(fileName: string): ImportFormat {
  return fileName.toLowerCase().endsWith(".json") ? "json" : "csv";
}

export function useTicketImportFlow(projectId: number): TicketImportFlow {
  const [fileName, setFileName] = useState<string | null>(null);
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [content, setRawContent] = useState("");
  const [mode, setMode] = useState<ImportMode>("atomic");
  const [preview, setPreview] = useState<TicketImportPreview | null>(null);
  const [report, setReport] = useState<TicketImportReport | null>(null);
  const abort = useRef<AbortController | null>(null);

  const previewMutation = usePreviewTicketImport(projectId);
  const commitMutation = useCommitTicketImport(projectId);

  const setContent = useCallback((next: string, nextFileName?: string) => {
    setRawContent(next);
    setPreview(null);
    setReport(null);
    if (nextFileName !== undefined) setFileName(nextFileName);
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.size > IMPORT_MAX_CONTENT_BYTES) {
        toast.error(
          `That file is larger than ${IMPORT_MAX_CONTENT_BYTES} bytes and cannot be imported`,
        );
        return;
      }
      const text = await file.text();
      setFormat(formatForFileName(file.name));
      setContent(text, file.name);
    },
    [setContent],
  );

  const changeFormat = useCallback((next: ImportFormat) => {
    setFormat(next);
    setPreview(null);
    setReport(null);
  }, []);

  const cancelPreview = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
  }, []);

  const runPreview = useCallback(() => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setReport(null);
    previewMutation.mutate(
      { format, content, signal: controller.signal },
      {
        onSuccess: (next) => {
          abort.current = null;
          setPreview(next);
        },
        onError: (error) => {
          abort.current = null;
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [content, format, previewMutation]);

  const commit = useCallback(() => {
    const token = preview?.confirmationToken;
    if (!token) return;
    commitMutation.mutate(
      { format, content, confirmationToken: token, mode },
      {
        onSuccess: (next) => {
          setReport(next);
          if (next.summary.rolledBack > 0) toast.error("Import rolled back — nothing was written");
          else toast.success(`Imported ${next.summary.imported} tickets`);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [commitMutation, content, format, mode, preview]);

  const reset = useCallback(() => {
    cancelPreview();
    setFileName(null);
    setRawContent("");
    setPreview(null);
    setReport(null);
    setMode("atomic");
    setFormat("csv");
  }, [cancelPreview]);

  return {
    fileName,
    format,
    content,
    mode,
    preview,
    report,
    isPreviewing: previewMutation.isPending,
    isCommitting: commitMutation.isPending,
    canRunPreview: content.trim().length > 0,
    canCommitPreview: preview !== null && canCommit(preview) && report === null,
    setFormat: changeFormat,
    setMode,
    setContent,
    loadFile,
    runPreview,
    cancelPreview,
    commit,
    reset,
  };
}
