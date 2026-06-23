"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { HandbookVersionCard } from "@/features/hr/handbook/handbook-version-card";
import {
  HandbookCreateForm,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
} from "@/features/hr/handbook/handbook-create-form";

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

const hbKeys = {
  all: [...queryKeys.hr.all, "handbook"] as const,
  list: () => [...hbKeys.all, "list"] as const,
};

const VERSION_FORMAT_REGEX = /^\d+\.\d+$/;
const CONSECUTIVE_SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9 ]{2,}/;
const URL_HTTPS_REGEX = /^https:\/\/.+/;

type DocumentInputMode = "url" | "file";

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
      changelog?: string;
      documentUrl?: string;
    }) => apiClient.post<HandbookVersion>("/hr/handbook", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const uploadDoc = useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<StorageUploadResult>("/storage/upload", formData),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: {
      id: number;
      status?: "PUBLISHED" | "DRAFT";
      title?: string;
      version?: string;
      documentUrl?: string;
      changelog?: string;
    }) => apiClient.patch<{ success: boolean }>(`/hr/handbook/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/handbook/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: hbKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editVersion, setEditVersion] = useState<HandbookVersion | null>(null);
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
    setEditVersion(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedVersion = version.trim();
    if (!trimmedVersion) { toast.error("Version is required"); return; }
    if (trimmedVersion.length > 10) { toast.error("Version must be at most 10 characters"); return; }
    if (!VERSION_FORMAT_REGEX.test(trimmedVersion)) {
      toast.error("Version must be in MAJOR.MINOR format (e.g., 1.0, 2.3)");
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
    } else if (selectedFile) {
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

    if (editVersion) {
      update.mutate(
        {
          id: editVersion.id,
          version: trimmedVersion,
          title: trimmedTitle,
          changelog: changelog.trim() || undefined,
          documentUrl: resolvedDocumentUrl ?? "",
        },
        {
          onSuccess: () => {
            toast.success("Handbook version updated");
            setSheetOpen(false);
            resetForm();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
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
  }, [version, title, changelog, documentUrl, documentInputMode, selectedFile, editVersion, create, update, uploadDoc, resetForm]);

  const handleVersionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setVersion(e.target.value),
    [],
  );
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    [],
  );
  const handleChangelogChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setChangelog(e.target.value),
    [],
  );
  const handleDocumentUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDocumentUrl(e.target.value),
    [],
  );
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

  const handlePublish = useCallback(
    (id: number) => {
      update.mutate(
        { id, status: "PUBLISHED" },
        {
          onSuccess: () => toast.success("Version published"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [update],
  );

  const handleUnpublish = useCallback(
    (id: number) => {
      update.mutate(
        { id, status: "DRAFT" },
        {
          onSuccess: () => toast.success("Version unpublished"),
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

  const handleOpenDeleteDialog = useCallback((id: number) => setDeleteId(id), []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetForm();
      setSheetOpen(open);
    },
    [resetForm],
  );

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleOpenEdit = useCallback((v: HandbookVersion) => {
    setEditVersion(v);
    setVersion(v.version);
    setTitle(v.title);
    setChangelog(v.changelog ?? "");
    setDocumentUrl(v.documentUrl ?? "");
    setDocumentInputMode("url");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSheetOpen(true);
  }, []);

  const handleNewVersionClick = useCallback(() => setSheetOpen(true), []);

  const isSubmitting = create.isPending || update.isPending || uploadDoc.isPending;

  if (isLoading) {
    return (
      <PageWrapper title="Handbook" subtitle="Employee handbook versions">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
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
        <Button size="sm" onClick={handleNewVersionClick}>
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
          {versions.map((v) => (
            <HandbookVersionCard
              key={v.id}
              version={v}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDeleteDialog}
              isUpdating={update.isPending}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editVersion ? "Edit Handbook Version" : "New Handbook Version"}
        onSubmit={handleSave}
        submitLabel={editVersion ? "Save Changes" : "Create"}
        isPending={isSubmitting}
      >
        <HandbookCreateForm
          values={{ version, title, changelog, documentUrl, documentInputMode, selectedFile }}
          onVersionChange={handleVersionChange}
          onTitleChange={handleTitleChange}
          onChangelogChange={handleChangelogChange}
          onDocumentUrlChange={handleDocumentUrlChange}
          onFileChange={handleFileChange}
          onSwitchToUrl={handleSwitchToUrl}
          onSwitchToFile={handleSwitchToFile}
          fileInputRef={fileInputRef}
        />
      </HrSheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Version"
        description="Are you sure you want to delete this handbook version? Drafts can be deleted; published versions must be unpublished first."
        confirmLabel="Delete"
        destructive
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
