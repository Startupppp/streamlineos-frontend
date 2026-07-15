"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Folder,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  History,
  File,
  FileSpreadsheet,
  FileImage,
  Upload,
  Pencil,
  Loader2,
  FileSignature,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";
import type { Document } from "@/types/hr";

const DOCUMENT_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ID_PROOF", label: "ID Proof" },
  { value: "PAYSLIP", label: "Payslip" },
  { value: "POLICY", label: "Policy" },
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "RESUME", label: "Resume" },
  { value: "OTHER", label: "Other" },
] as const;

const FILE_ICON_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pdf: {
    bg: "bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
    icon: FileText,
  },
  docx: {
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
    icon: FileText,
  },
  doc: {
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-400",
    icon: FileText,
  },
  xlsx: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: FileSpreadsheet,
  },
  xls: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: FileSpreadsheet,
  },
  csv: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: FileSpreadsheet,
  },
  png: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    icon: FileImage,
  },
  jpg: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    icon: FileImage,
  },
  jpeg: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    icon: FileImage,
  },
};

const DEFAULT_FILE_ICON = {
  bg: "bg-muted",
  text: "text-muted-foreground",
  icon: File,
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  Contract:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  Certificate:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  "ID Proof":
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  Payslip:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  Policy:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  "Offer Letter":
    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800",
  Resume:
    "bg-muted text-foreground border-border dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
  General:
    "bg-muted text-foreground border-border dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
};

const FOLDER_COLORS = [
  "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  "bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
];

function getFileIconConfig(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICON_CONFIG[ext] ?? DEFAULT_FILE_ICON;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FolderItem {
  name: string;
  count: number;
  colorIdx: number;
}

export interface DocumentTableProps {
  paginatedDocuments: Document[];
  allFilteredDocuments: Document[];
  folders: FolderItem[];
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  selectedCategory: string;
  searchTerm: string;
  onPageChange: (page: number) => void;
  onDelete: (documentId: number) => Promise<void>;
  onEdit: (doc: Document) => void;
  onOpenUpload: () => void;
  onSendForSignature: (doc: Document) => void;
}

export function DocumentTable({
  paginatedDocuments,
  allFilteredDocuments,
  folders,
  page,
  pageSize,
  totalFiltered,
  totalPages,
  selectedCategory,
  searchTerm,
  onPageChange,
  onDelete,
  onEdit,
  onOpenUpload,
  onSendForSignature,
}: DocumentTableProps) {
  const [isZipping, setIsZipping] = useState(false);

  const filesWithUrl = allFilteredDocuments.filter((d) => !!d.fileUrl);

  const handleDownloadZip = useCallback(async () => {
    if (filesWithUrl.length === 0) return;
    setIsZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const results = await Promise.allSettled(
        filesWithUrl.map(async (doc) => {
          const response = await fetch(doc.fileUrl);
          if (!response.ok)
            throw new Error(`Failed to fetch ${doc.fileName ?? doc.name}`);
          const blob = await response.blob();
          zip.file(doc.fileName ?? `${doc.name}.bin`, blob);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
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

  const columns = useMemo<DataTableColumn<Document>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        cell(doc) {
          const fileConfig = getFileIconConfig(doc.fileName ?? doc.name);
          const FileIcon = fileConfig.icon;
          return (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                  fileConfig.bg,
                )}
              >
                <FileIcon className={cn("h-3.5 w-3.5", fileConfig.text)} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-snug">
                  {doc.fileName ?? doc.name}
                </p>
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex items-center text-[10px] font-semibold px-1.5 py-0 rounded-full border",
                          tag.toLowerCase().includes("confidential")
                            ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800"
                            : "bg-muted text-muted-foreground border-border",
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: "type",
        header: "Type",
        cell(doc) {
          const typeLabel =
            DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ??
            "General";
          const badgeColor =
            TYPE_BADGE_COLORS[typeLabel] ?? TYPE_BADGE_COLORS["General"];
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                badgeColor,
              )}
            >
              {typeLabel}
            </span>
          );
        },
      },
      {
        key: "date",
        header: "Date",
        className: "text-sm text-muted-foreground tabular-nums",
        cell(doc) {
          return doc.createdAt
            ? format(new Date(doc.createdAt), "MMM dd, yyyy")
            : "—";
        },
      },
      {
        key: "size",
        header: "Size",
        headerClassName: "text-right",
        className: "text-sm text-muted-foreground text-right tabular-nums",
        cell(doc) {
          return formatFileSize(doc.fileSize);
        },
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "text-right",
        cell(doc) {
          const hasFileUrl = !!doc.fileUrl;

          function handleView(e: React.MouseEvent) {
            e.stopPropagation();
            if (!hasFileUrl) {
              toast.error("No file attached to this document.");
              return;
            }
            viewFile(doc.fileUrl);
          }

          function handleDownload(e: React.MouseEvent) {
            e.stopPropagation();
            if (!hasFileUrl) {
              toast.error("No file attached to this document.");
              return;
            }
            downloadFile(doc.fileUrl, doc.fileName ?? doc.name);
          }

          function handleVersionHistory(e: React.MouseEvent) {
            e.stopPropagation();
            toast.info(`"${doc.name}" has ${doc.version} versions.`);
          }

          function handleDelete(e: React.MouseEvent) {
            e.stopPropagation();
            void onDelete(doc.id);
          }

          function handleEdit(e: React.MouseEvent) {
            e.stopPropagation();
            onEdit(doc);
          }

          function handleMenuTriggerClick(e: React.MouseEvent) {
            e.stopPropagation();
          }

          function handleSendForSignature(e: React.MouseEvent) {
            e.stopPropagation();
            onSendForSignature(doc);
          }

          return (
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 text-muted-foreground hover:text-foreground"
                disabled={!hasFileUrl}
                onClick={handleView}
                aria-label="View document"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 text-muted-foreground hover:text-foreground"
                disabled={!hasFileUrl}
                onClick={handleDownload}
                aria-label="Download document"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 text-muted-foreground hover:text-foreground"
                onClick={handleEdit}
                aria-label="Edit document"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={handleMenuTriggerClick}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 text-muted-foreground hover:text-foreground"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem disabled={!hasFileUrl} onClick={handleView}>
                    <Eye className="mr-2 h-3.5 w-3.5" />
                    View file
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!hasFileUrl}
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSendForSignature}>
                    <FileSignature className="mr-2 h-3.5 w-3.5" />
                    Send for e-signature
                  </DropdownMenuItem>
                  {(doc.version ?? 1) > 1 && (
                    <DropdownMenuItem onClick={handleVersionHistory}>
                      <History className="mr-2 h-3.5 w-3.5" />
                      History ({doc.version})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onDelete, onEdit, onSendForSignature],
  );

  const emptyState = (
    <EmptyState
      illustration={<Upload className="w-8 text-muted-foreground" />}
      title="No documents found"
      description="Upload your first document to get started"
      action={{
        label: "Upload Document",
        onClick: onOpenUpload,
      }}
    />
  );

  const footer =
    totalFiltered > 0 && filesWithUrl.length > 0 ? (
      <div className="flex items-center gap-2.5">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={handleDownloadZip}
          disabled={isZipping}
        >
          {isZipping ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          ZIP ({filesWithUrl.length})
        </Button>
      </div>
    ) : undefined;

  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-0" aria-live="polite">
        {showFolders && folders.length > 0 && (
          <div className="px-5 pt-4 pb-3 border-b border-border/50">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Folders
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {folders.map((folder) => (
                <button
                  key={folder.name}
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
                    <p className="text-xs font-medium text-foreground truncate">
                      {folder.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {folder.count} files
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <DataTable
          data={paginatedDocuments}
          columns={columns}
          getRowKey={(doc) => doc.id}
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: totalFiltered,
            onPageChange,
          }}
          emptyState={emptyState}
          footer={footer}
          minWidth="640px"
        />
      </CardContent>
    </Card>
  );
}
