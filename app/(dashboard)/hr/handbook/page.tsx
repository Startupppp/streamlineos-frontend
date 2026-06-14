"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, FileText, Eye, Trash2, ExternalLink, Upload, Link2 } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

interface HandbookVersion {
  id: number;
  version: string;
  title: string;
  changelog: string | null;
  documentUrl: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
}

interface StorageUploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

const hbKeys = { all: [...queryKeys.hr.all, "handbook"] as const, list: () => [...hbKeys.all, "list"] as const };

const VERSION_FORMAT_REGEX = /^v?[0-9]+(\.[0-9]+)*(-[a-zA-Z0-9]+)?$/;
const CONSECUTIVE_SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9 ]{2,}/;
const URL_HTTPS_REGEX = /^https:\/\/.+/;

const ACCEPTED_FILE_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ACCEPTED_FILE_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type DocumentInputMode = "url" | "file";

function statusBadge(v: HandbookVersion): "default" | "secondary" {
  return v.publishedAt ? "default" : "secondary";
}

function HandbookContent() {
  const qc = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: hbKeys.list(),
    queryFn: () => apiClient.get<HandbookVersion[]>("/hr/handbook"),
  });

  const create = useMutation({
    mutationFn: (data: { version: string; title: string; changelog?: string; documentUrl?: string }) =>
      apiClient.post<HandbookVersion>("/hr/handbook", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const uploadDoc = useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<StorageUploadResult>("/storage/upload", formData),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: "PUBLISHED" | "DRAFT" }) =>
      apiClient.patch<{ success: boolean }>(`/hr/handbook/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/handbook/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [changelog, setChangelog] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentInputMode, setDocumentInputMode] = useState<DocumentInputMode>("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setVersion("");
    setTitle("");
    setChangelog("");
    setDocumentUrl("");
    setDocumentInputMode("url");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedVersion = version.trim();
    if (!trimmedVersion) { toast.error("Version is required"); return; }
    if (trimmedVersion.length < 1) { toast.error("Version is required"); return; }
    if (trimmedVersion.length > 20) { toast.error("Version must be at most 20 characters"); return; }
    if (!VERSION_FORMAT_REGEX.test(trimmedVersion)) {
      toast.error("Version must be a valid format (e.g., 1.0, v1.0, 2024-01)");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 100) { toast.error("Title must be at most 100 characters"); return; }
    if (/  /.test(trimmedTitle)) { toast.error("Title must not contain consecutive spaces"); return; }
    if (CONSECUTIVE_SPECIAL_CHARS_REGEX.test(trimmedTitle)) {
      toast.error("Title must not contain consecutive special characters");
      return;
    }

    if (changelog.length > 2000) { toast.error("Notes must be at most 2000 characters"); return; }

    let resolvedDocumentUrl: string | undefined;

    if (documentInputMode === "url") {
      const trimmedUrl = documentUrl.trim();
      if (trimmedUrl) {
        if (!URL_HTTPS_REGEX.test(trimmedUrl)) {
          toast.error("Document URL must start with https://");
          return;
        }
        try {
          new URL(trimmedUrl);
        } catch {
          toast.error("Document URL must be a valid URL");
          return;
        }
        resolvedDocumentUrl = trimmedUrl;
      }
    } else {
      if (selectedFile) {
        if (!ACCEPTED_FILE_TYPES.includes(selectedFile.type)) {
          toast.error("Only PDF and DOCX files are allowed");
          return;
        }
        const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
        if (!ACCEPTED_FILE_EXTENSIONS.includes(ext)) {
          toast.error("Only PDF and DOCX files are allowed");
          return;
        }
        if (selectedFile.size > MAX_FILE_SIZE) {
          toast.error("File must be smaller than 10MB");
          return;
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folder", "handbook");
        try {
          const result = await uploadDoc.mutateAsync(formData);
          resolvedDocumentUrl = result.url;
        } catch (e) {
          toast.error(getErrorMessage(e));
          return;
        }
      }
    }

    create.mutate(
      {
        version: trimmedVersion,
        title: trimmedTitle,
        changelog: changelog.trim() || undefined,
        documentUrl: resolvedDocumentUrl,
      },
      {
        onSuccess: () => {
          toast.success("Handbook version created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [version, title, changelog, documentUrl, documentInputMode, selectedFile, create, uploadDoc, resetForm]);

  const handleVersionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVersion(e.target.value);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleChangelogChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChangelog(e.target.value);
  }, []);

  const handleDocumentUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentUrl(e.target.value);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) { setSelectedFile(null); return; }
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error("Only PDF and DOCX files are allowed");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be smaller than 10MB");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleSwitchToUrl = useCallback(() => {
    setDocumentInputMode("url");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSwitchToFile = useCallback(() => {
    setDocumentInputMode("file");
    setDocumentUrl("");
  }, []);

  const handlePublish = useCallback((id: number) => {
    update.mutate(
      { id, status: "PUBLISHED" },
      {
        onSuccess: () => toast.success("Version published"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [update]);

  const handleUnpublish = useCallback((id: number) => {
    update.mutate(
      { id, status: "DRAFT" },
      {
        onSuccess: () => toast.success("Version unpublished"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [update]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => { toast.success("Version deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleOpenDeleteDialog = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const handleNewVersionClick = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const isSubmitting = create.isPending || uploadDoc.isPending;

  if (isLoading) {
    return (
      <PageWrapper title="Handbook" subtitle="Employee handbook versions">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Handbook"
      subtitle="Manage and publish handbook versions"
      badge={`${versions?.length ?? 0} versions`}
      actions={<Button size="sm" onClick={handleNewVersionClick}><Plus className="h-3.5 w-3.5 mr-1" />New Version</Button>}
    >
      {!versions?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyDocumentsIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No handbook versions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {versions.map((v: HandbookVersion) => {
            const isPublished = !!v.publishedAt;
            return (
              <Card key={v.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{v.title || `Version ${v.version}`}</p>
                      <span className="text-xs text-muted-foreground">v{v.version}</span>
                      <Badge variant={statusBadge(v)} className="text-[10px]">
                        {isPublished ? "PUBLISHED" : "DRAFT"}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                      {v.changelog && <span className="line-clamp-1">{v.changelog}</span>}
                      {v.documentUrl && (
                        <a
                          href={v.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View Document
                        </a>
                      )}
                      {v.publishedAt && <span>Published {format(new Date(v.publishedAt), "MMM d, yyyy")}</span>}
                      {v.createdAt && <span>Created {format(new Date(v.createdAt), "MMM d, yyyy")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {!isPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handlePublish(v.id)}
                        disabled={update.isPending}
                      >
                        Publish
                      </Button>
                    )}
                    {isPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleUnpublish(v.id)}
                        disabled={update.isPending}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Unpublish
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => handleOpenDeleteDialog(v.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="New Handbook Version"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={isSubmitting}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
          <Input
            placeholder="e.g., 2024 Employee Handbook"
            value={title}
            onChange={handleTitleChange}
            maxLength={100}
          />
          <p className="text-[11px] text-muted-foreground">Min 2 chars, max 100 chars — no consecutive spaces or special characters</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Version <span className="text-destructive">*</span></label>
          <Input
            placeholder="e.g., 1.0, v1.0, 2024-01"
            value={version}
            onChange={handleVersionChange}
            maxLength={20}
          />
          <p className="text-[11px] text-muted-foreground">Format: 1.0, v1.0, 2024-01, 1.0.0-beta</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Document</label>
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={handleSwitchToUrl}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                documentInputMode === "url"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <Link2 className="h-3 w-3" />
              Enter URL
            </button>
            <button
              type="button"
              onClick={handleSwitchToFile}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                documentInputMode === "file"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <Upload className="h-3 w-3" />
              Upload File
            </button>
          </div>
          {documentInputMode === "url" ? (
            <>
              <Input
                placeholder="https://docs.example.com/handbook.pdf"
                value={documentUrl}
                onChange={handleDocumentUrlChange}
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
                {selectedFile ? (
                  <span className="text-xs font-medium text-foreground truncate max-w-full">{selectedFile.name}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Click to select a PDF or DOCX file</span>
                )}
              </label>
              <input
                id="handbook-file-input"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
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
            value={changelog}
            onChange={handleChangelogChange}
            rows={3}
            maxLength={2000}
          />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Version"
        description="Are you sure you want to delete this handbook version? Drafts can be deleted; published versions must be unpublished first."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </PageWrapper>
  );
}

export default function HandbookPage() {
  return (
    <DashboardGate allowedRoles={["HR"]}>
      <HandbookContent />
    </DashboardGate>
  );
}
