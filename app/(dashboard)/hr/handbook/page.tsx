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
import { Plus, FileText, Trash2, Eye, Pencil } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { handbookVersionSchema } from "@/lib/validations/handbook";

interface HandbookVersion {
  id: number;
  version: string;
  title: string;
  description: string | null;
  documentUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string | null;
}

const hbKeys = { all: [...queryKeys.hr.all, "handbook"] as const, list: () => [...hbKeys.all, "list"] as const };

function statusBadge(s: string | null): "default" | "secondary" | "outline" {
  if (s === "PUBLISHED") return "default";
  if (s === "ARCHIVED") return "outline";
  return "secondary";
}

function HandbookFormFields({
  version,
  setVersion,
  title,
  setTitle,
  description,
  setDescription,
  documentUrl,
  setDocumentUrl,
}: {
  version: string;
  setVersion: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  documentUrl: string;
  setDocumentUrl: (v: string) => void;
}) {
  return (
    <div className="space-y-4 max-w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 min-w-0">
          <label className="text-sm font-medium">Version</label>
          <Input
            className="max-w-full"
            placeholder="e.g. 2.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            maxLength={32}
          />
        </div>
        <div className="space-y-1.5 min-w-0">
          <label className="text-sm font-medium">Title</label>
          <Input
            className="max-w-full"
            placeholder="e.g. Q1 2026 Update"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          className="max-w-full resize-y min-h-[80px] max-h-[200px]"
          placeholder="What changed in this version..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
      </div>
      <div className="space-y-1.5 min-w-0">
        <label className="text-sm font-medium">Document URL</label>
        <Input
          className="max-w-full"
          placeholder="https://..."
          value={documentUrl}
          onChange={(e) => setDocumentUrl(e.target.value)}
          type="url"
        />
      </div>
    </div>
  );
}

function HandbookContent() {
  const qc = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    queryKey: hbKeys.list(),
    queryFn: () => apiClient.get<HandbookVersion[]>("/hr/handbook"),
  });

  const create = useMutation({
    mutationFn: (data: {
      version: string;
      title: string;
      description?: string;
      documentUrl?: string;
    }) => apiClient.post<HandbookVersion>("/hr/handbook", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        version?: string;
        title?: string;
        description?: string;
        documentUrl?: string;
        status?: string;
      };
    }) => apiClient.patch<HandbookVersion>(`/hr/handbook/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/handbook/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");

  const resetForm = useCallback(() => {
    setVersion("");
    setTitle("");
    setDescription("");
    setDocumentUrl("");
  }, []);

  const openEdit = useCallback((v: HandbookVersion) => {
    setEditId(v.id);
    setVersion(v.version);
    setTitle(v.title);
    setDescription(v.description ?? "");
    setDocumentUrl(v.documentUrl ?? "");
  }, []);

  const validateForm = useCallback(() => {
    const parsed = handbookVersionSchema.safeParse({
      version: version.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      documentUrl: documentUrl.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return null;
    }
    return parsed.data;
  }, [version, title, description, documentUrl]);

  const handleCreate = useCallback(() => {
    const data = validateForm();
    if (!data) return;
    create.mutate(
      {
        version: data.version,
        title: data.title,
        description: data.description,
        documentUrl: data.documentUrl,
      },
      {
        onSuccess: () => {
          toast.success("Handbook version created as draft");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [validateForm, create, resetForm]);

  const handleUpdate = useCallback(() => {
    if (!editId) return;
    const data = validateForm();
    if (!data) return;
    update.mutate(
      {
        id: editId,
        data: {
          version: data.version,
          title: data.title,
          description: data.description,
          documentUrl: data.documentUrl,
        },
      },
      {
        onSuccess: () => {
          toast.success("Handbook version updated");
          setEditId(null);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editId, validateForm, update, resetForm]);

  const handlePublish = useCallback(
    (id: number) => {
      update.mutate(
        { id, data: { status: "PUBLISHED" } },
        {
          onSuccess: () => toast.success("Version published"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [update],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Version deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove]);

  if (isLoading) {
    return (
      <PageWrapper title="Handbook" subtitle="Employee handbook versions">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Employee Handbook"
      subtitle="Manage and publish handbook versions"
      badge={`${versions?.length ?? 0} versions`}
      actions={
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setSheetOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Version
        </Button>
      }
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
          {versions.map((v: HandbookVersion) => (
            <Card key={v.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate max-w-[200px] sm:max-w-none">
                      {v.title}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      v{v.version}
                    </Badge>
                    <Badge variant={statusBadge(v.status)} className="text-[10px]">
                      {v.status}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    {v.description && (
                      <span className="line-clamp-1 max-w-full">{v.description}</span>
                    )}
                    {v.publishedAt && (
                      <span>Published {format(new Date(v.publishedAt), "MMM d, yyyy")}</span>
                    )}
                    {v.createdAt && (
                      <span>Created {format(new Date(v.createdAt), "MMM d, yyyy")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                  {v.documentUrl && (
                    <a href={v.documentUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => openEdit(v)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {v.status === "DRAFT" && (
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
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) resetForm();
        }}
        title="New Handbook Version"
        onSubmit={handleCreate}
        submitLabel="Save as draft"
        isPending={create.isPending}
      >
        <HandbookFormFields
          version={version}
          setVersion={setVersion}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          documentUrl={documentUrl}
          setDocumentUrl={setDocumentUrl}
        />
      </HrSheet>

      <HrSheet
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
            resetForm();
          }
        }}
        title="Edit Handbook Version"
        onSubmit={handleUpdate}
        submitLabel="Save changes"
        isPending={update.isPending}
      >
        <HandbookFormFields
          version={version}
          setVersion={setVersion}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          documentUrl={documentUrl}
          setDocumentUrl={setDocumentUrl}
        />
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete Version"
        description="Are you sure you want to delete this handbook version?"
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
