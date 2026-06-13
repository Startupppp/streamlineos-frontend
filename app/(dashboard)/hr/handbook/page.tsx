"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
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
import { Plus, FileText, Eye, Trash2, Upload, ExternalLink } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

interface HandbookVersion {
  id: number;
  version: string;
  changelog: string | null;
  documentUrl: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  createdAt: string;
}

const hbKeys = { all: [...queryKeys.hr.all, "handbook"] as const, list: () => [...hbKeys.all, "list"] as const };

const VERSION_REGEX = /^(\d+)(\.\d+){0,2}(-[\w.]+)?$/;

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
    mutationFn: (data: { version: string; changelog?: string; documentUrl?: string }) =>
      apiClient.post<HandbookVersion>("/hr/handbook", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
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
  const [changelog, setChangelog] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = useCallback(() => {
    setVersion("");
    setChangelog("");
    setUploadFile(null);
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmedVersion = version.trim();
    if (!trimmedVersion) { toast.error("Version is required"); return; }
    if (trimmedVersion.length < 3) { toast.error("Version must be at least 3 characters (e.g., 1.0)"); return; }
    if (trimmedVersion.length > 20) { toast.error("Version must be at most 20 characters"); return; }
    if (!VERSION_REGEX.test(trimmedVersion)) {
      toast.error("Version must be a valid format (e.g., 1.0, 2.1.3) — no consecutive dots or invalid characters");
      return;
    }
    if (changelog.length > 2000) { toast.error("Notes must be at most 2000 characters"); return; }

    let documentUrl: string | undefined;

    if (uploadFile) {
      setIsUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", uploadFile);
        fd.append("folder", "handbook");
        const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
        const json = await res.json() as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          toast.error(json.error ?? "File upload failed");
          return;
        }
        documentUrl = json.url;
      } catch {
        toast.error("File upload failed");
        return;
      } finally {
        setIsUploading(false);
      }
    }

    create.mutate(
      { version: trimmedVersion, changelog: changelog.trim() || undefined, documentUrl },
      {
        onSuccess: () => {
          toast.success("Handbook version created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [version, changelog, uploadFile, create, resetForm]);

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
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Version</Button>}
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
                      <p className="text-sm font-semibold">Version {v.version}</p>
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
                      onClick={() => setDeleteId(v.id)}
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
        onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }}
        title="New Handbook Version"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending || isUploading}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Version <span className="text-destructive">*</span></label>
          <Input
            placeholder="e.g., 1.0, 2.1.3"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">Format: major.minor.patch (e.g., 1.0, 2.1, 3.0.1)</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Handbook Document</label>
          <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center">
                {uploadFile ? uploadFile.name : "Click to upload PDF or Word document"}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > 10 * 1024 * 1024) {
                    toast.error("File must be under 10MB");
                    return;
                  }
                  setUploadFile(f);
                }}
              />
            </label>
            {uploadFile && (
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-destructive underline block mx-auto"
                onClick={() => setUploadFile(null)}
              >
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Accepted: PDF, DOC, DOCX (max 10MB)</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Changelog / Notes</label>
          <Textarea
            placeholder="What changed in this version..."
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
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
