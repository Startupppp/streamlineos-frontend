"use client";

import { useCallback, memo, useState } from "react";
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
  ArrowDown,
  Upload,
  Pencil,
  Loader2,
} from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { viewFile, downloadFile } from "@/hooks/use-file-url";
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

const FILE_ICON_CONFIG: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  pdf:  { bg: "bg-red-100 dark:bg-red-900/20",    text: "text-red-600 dark:text-red-400",    icon: FileText },
  docx: { bg: "bg-blue-100 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   icon: FileText },
  doc:  { bg: "bg-blue-100 dark:bg-blue-900/20",   text: "text-blue-600 dark:text-blue-400",   icon: FileText },
  xlsx: { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  xls:  { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  csv:  { bg: "bg-emerald-100 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  png:  { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: FileImage },
  jpg:  { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: FileImage },
  jpeg: { bg: "bg-amber-100 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", icon: FileImage },
};

const DEFAULT_FILE_ICON = { bg: "bg-slate-100 dark:bg-slate-800/30", text: "text-slate-600 dark:text-slate-400", icon: File };

const CATEGORY_COLORS: Record<string, string> = {
  Policies: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  Templates: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  Payroll: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  "Tax Forms": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  General: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700",
};

const FOLDER_COLORS = [
  "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
];

function getFileIconConfig(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_CONFIG[ext] || DEFAULT_FILE_ICON;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
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
}


interface DocumentRowProps {
  doc: Document;
  onDelete: (id: number) => Promise<void>;
  onEdit: (doc: Document) => void;
}

const DocumentRow = memo(function DocumentRow({ doc, onDelete, onEdit }: DocumentRowProps) {
  const fileConfig = getFileIconConfig(doc.fileName || doc.name);
  const FileIcon = fileConfig.icon;
  const typeLabel =
    DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || "General";
  const categoryColor = CATEGORY_COLORS[typeLabel] || CATEGORY_COLORS.General;
  const hasFileUrl = !!doc.fileUrl;

  const handleView = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasFileUrl) { toast.error("This document has no file attached."); return; }
      viewFile(doc.fileUrl);
    },
    [hasFileUrl, doc.fileUrl],
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!hasFileUrl) { toast.error("This document has no file attached."); return; }
      downloadFile(doc.fileUrl, doc.fileName || doc.name);
    },
    [hasFileUrl, doc.fileUrl, doc.fileName, doc.name],
  );

  const handleVersionHistory = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toast.info(`Document "${doc.name}" has ${doc.version} versions.`);
    },
    [doc.name, doc.version],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void onDelete(doc.id);
    },
    [onDelete, doc.id],
  );

  const handleEdit = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(doc); }, [onEdit, doc]);
  const handleMenuTriggerClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <TableRow className="hover:bg-muted/30 transition-colors group">
      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${fileConfig.bg}`}>
            <FileIcon className={`h-5 w-5 ${fileConfig.text}`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">
              {doc.fileName || doc.name}
            </p>
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex gap-1.5 mt-1">
                {doc.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 font-medium ${
                      tag.toLowerCase().includes("confidential")
                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                        : "bg-muted/50 text-muted-foreground border-border"
                    }`}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4">
        <Badge variant="outline" className={`text-xs font-medium ${categoryColor}`}>
          {typeLabel}
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
        {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : "-"}
      </TableCell>
      <TableCell className="px-6 py-4 text-sm text-muted-foreground text-right">
        {formatFileSize(doc.fileSize)}
      </TableCell>
      <TableCell className="px-6 py-4">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!hasFileUrl}
            onClick={handleView}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!hasFileUrl}
            onClick={handleDownload}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={handleMenuTriggerClick}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!hasFileUrl} onClick={handleView}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasFileUrl} onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {(doc.version || 1) > 1 && (
                <DropdownMenuItem onClick={handleVersionHistory}>
                  <History className="mr-2 h-4 w-4" />
                  Version History ({doc.version})
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});


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
          if (!response.ok) throw new Error(`Failed to fetch ${doc.fileName ?? doc.name}`);
          const blob = await response.blob();
          const fileName = doc.fileName ?? `${doc.name}.bin`;
          zip.file(fileName, blob);
        })
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
        toast.warning(`${filesWithUrl.length - failed} file(s) downloaded; ${failed} could not be fetched.`);
      } else {
        toast.success(`${filesWithUrl.length} file(s) packaged into ZIP`);
      }
    } catch {
      toast.error("Failed to create ZIP archive");
    } finally {
      setIsZipping(false);
    }
  }, [filesWithUrl]);

  return (
    <Card className="shadow-sm border overflow-hidden">
      <CardContent className="p-0" aria-live="polite">
        <ScrollArea className="w-full max-h-[60vh]" type="auto">
        <div className="min-w-[700px]">
        <Table>
          <caption className="sr-only">Document library</caption>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead
                scope="col"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3"
              >
                <div className="flex items-center gap-1">
                  Name
                  <ArrowDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                scope="col"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3"
              >
                Category
              </TableHead>
              <TableHead
                scope="col"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3"
              >
                Date Modified
              </TableHead>
              <TableHead
                scope="col"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 text-right"
              >
                Size
              </TableHead>
              <TableHead
                scope="col"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 text-right"
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>

            {page === 1 && selectedCategory === "All Files" && searchTerm === "" && (
              <>
                <TableRow>
                  <TableCell colSpan={5} className="px-6 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Folders
                    </p>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="px-6 py-0 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {folders.map((folder) => (
                        <button
                          key={folder.name}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className={`p-2 rounded-lg ${FOLDER_COLORS[folder.colorIdx]}`}>
                            <Folder className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">{folder.count} files</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              </>
            )}

            {paginatedDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center justify-center py-16">
                    <EmptyDocumentsIllustration className="mb-3" />
                    <h3 className="text-lg font-medium text-foreground">No documents found</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload your first document to get started
                    </p>
                    <Button onClick={onOpenUpload}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedDocuments.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} onEdit={onEdit} />
              ))
            )}
          </TableBody>
        </Table>
        </div>
        </ScrollArea>

        {totalFiltered > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Showing{" "}
                <strong className="text-foreground">
                  {Math.min((page - 1) * pageSize + 1, totalFiltered)}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {Math.min(page * pageSize, totalFiltered)}
                </strong>{" "}
                of <strong className="text-foreground">{totalFiltered}</strong> results
              </span>
              {filesWithUrl.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                >
                  {isZipping ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download ZIP ({filesWithUrl.length})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
