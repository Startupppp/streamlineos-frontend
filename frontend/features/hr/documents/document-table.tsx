"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, Folder } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Document } from "@/types/hr";
import { FOLDER_COLORS } from "./document-table-constants";
import { getProtectedFileUrl } from "@/hooks/common/use-file-url";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { createDocumentColumns } from "./document-columns";

export interface FolderItem {
  name: string;
  count: number;
  colorIdx: number;
}

export interface DocumentTableProps {
  documents: Document[];
  folders: FolderItem[];
  page: number;
  hasNext: boolean;
  isFetching: boolean;
  selectedCategory: string;
  searchTerm: string;
  canManageDocs: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onDelete: (documentId: number) => Promise<void>;
  onEdit: (doc: Document) => void;
  onOpenUpload: () => void;
  onSendForSignature: (doc: Document) => void;
  onClassify?: (doc: Document) => void;
}

export function DocumentTable({
  documents,
  folders,
  page,
  hasNext,
  isFetching,
  selectedCategory,
  searchTerm,
  canManageDocs,
  onPreviousPage,
  onNextPage,
  onDelete,
  onEdit,
  onOpenUpload,
  onSendForSignature,
  onClassify,
}: DocumentTableProps) {
  const [isZipping, setIsZipping] = useState(false);

  const filesWithUrl = documents.filter((document) => document.hasFile);

  const handleDownloadZip = useCallback(async () => {
    if (filesWithUrl.length === 0) return;
    setIsZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const results = await Promise.allSettled(
        filesWithUrl.map(async (doc) => {
          const response = await fetch(
            await getProtectedFileUrl(`/hr/documents/${doc.id}/file`),
          );
          if (!response.ok)
            throw new Error(`Failed to fetch ${doc.fileName ?? doc.name}`);
          const blob = await response.blob();
          zip.file(doc.fileName ?? `${doc.name}.bin`, blob);
        }),
      );
      const failed = results.filter(
        (downloadResult) => downloadResult.status === "rejected",
      ).length;
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "documents.zip";
      anchor.click();
      URL.revokeObjectURL(url);
      if (failed > 0) {
        toast.warning(
          `${filesWithUrl.length - failed} downloaded; ${failed} failed.`,
        );
      } else {
        toast.success(`${filesWithUrl.length} file(s) packaged into ZIP`);
      }
    } catch {
      toast.error("Failed to create ZIP archive");
    } finally {
      setIsZipping(false);
    }
  }, [filesWithUrl]);

  const showFolders =
    page === 1 && selectedCategory === "All Files" && searchTerm === "";

  const columns = useMemo(
    () => createDocumentColumns(onDelete, onEdit, onSendForSignature, onClassify),
    [onDelete, onEdit, onSendForSignature, onClassify],
  );

  const emptyState = (
    <EmptyState
      illustrationPreset="upload"
      title="No documents found"
      description="Upload your first document to get started"
      action={
        canManageDocs
          ? { label: "Upload Document", onClick: onOpenUpload }
          : undefined
      }
      actionVariant="outline"
    />
  );

  const footer =
    filesWithUrl.length > 0 ? (
      <div className="flex items-center gap-2.5">
        <LoadingButton
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={handleDownloadZip}
          isPending={isZipping}
          loadingText="Zipping..."
        >
          <Download className="h-3 w-3" />
          ZIP this page ({filesWithUrl.length})
        </LoadingButton>
      </div>
    ) : undefined;

  return (
    <div
      className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm"
      aria-live="polite"
      aria-busy={isFetching}
    >
      {showFolders && folders.length > 0 && (
        <div className="px-5 pt-4 pb-3 border-b border-border/50 shrink-0">
          <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Folders
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {folders.map((folder) => (
              <button
                key={folder.name}
                type="button"
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors duration-200 text-left"
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    FOLDER_COLORS[folder.colorIdx],
                  )}
                >
                  <Folder className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <TruncatedText
                    text={folder.name}
                    className="text-xs font-medium text-foreground"
                  />
                  <p className="text-micro text-muted-foreground">
                    {folder.count} files
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <DataTable
        data={documents}
        columns={columns}
        getRowKey={(doc) => doc.id}
        emptyState={emptyState}
        footer={footer}
        minWidth="640px"
        className="flex-1 min-h-0 border-0 rounded-none"
      />
      {page > 1 || hasNext ? (
        <CursorPageControls
          page={page}
          hasNext={hasNext}
          disabled={isFetching}
          onPrevious={onPreviousPage}
          onNext={onNextPage}
          className="m-2"
        />
      ) : null}
    </div>
  );
}
