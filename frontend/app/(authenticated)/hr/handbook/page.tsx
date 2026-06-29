"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useRef, useMemo } from "react";
import {
  useHandbookVersions,
  useCreateHandbookVersion,
  useUpdateHandbookVersion,
  useDeleteHandbookVersion,
  type HandbookVersion,
} from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { HandbookVersionCard } from "@/features/hr/handbook/handbook-version-card";
import {
  HandbookCreateForm,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
} from "@/features/hr/handbook/handbook-create-form";
import { cn } from "@/lib/utils";

const VERSION_FORMAT_REGEX = /^\d+\.\d+$/;
const CONSECUTIVE_SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9 ]{2,}/;
const URL_HTTPS_REGEX = /^https:\/\/.+/;

type DocumentInputMode = "url" | "file";
type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
];

function HandbookContent() {
  const { data: versions, isLoading, isError, refetch } = useHandbookVersions();
  const create = useCreateHandbookVersion();
  const update = useUpdateHandbookVersion();
  const remove = useDeleteHandbookVersion();
  const uploadFile = useUploadFile();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editVersion, setEditVersion] = useState<HandbookVersion | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [changelog, setChangelog] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentInputMode, setDocumentInputMode] = useState<DocumentInputMode>("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredVersions = useMemo(() => {
    if (!versions) return [];
    return versions.filter((v) => {
      const matchesSearch =
        !searchQuery ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.version.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PUBLISHED" ? !!v.publishedAt : !v.publishedAt);
      return matchesSearch && matchesStatus;
    });
  }, [versions, searchQuery, statusFilter]);

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
      try {
        const result = await uploadFile.mutateAsync({ file: selectedFile, folder: "handbook" });
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
  }, [
    version,
    title,
    changelog,
    documentUrl,
    documentInputMode,
    selectedFile,
    editVersion,
    create,
    update,
    uploadFile,
    resetForm,
  ]);

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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleStatusFilterAll = useCallback(() => setStatusFilter("ALL"), []);
  const handleStatusFilterPublished = useCallback(() => setStatusFilter("PUBLISHED"), []);
  const handleStatusFilterDraft = useCallback(() => setStatusFilter("DRAFT"), []);

  const statusFilterHandlers: Record<StatusFilter, () => void> = {
    ALL: handleStatusFilterAll,
    PUBLISHED: handleStatusFilterPublished,
    DRAFT: handleStatusFilterDraft,
  };

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const isSubmitting = create.isPending || update.isPending || uploadFile.isPending;
  const isFiltered = !!searchQuery || statusFilter !== "ALL";

  if (isLoading) {
    return (
      <PageWrapper title="Employee Handbook" subtitle="Manage and publish handbook versions">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Employee Handbook" subtitle="Manage and publish handbook versions">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Failed to load handbook versions</p>
            <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
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
        <Button size="sm" className="h-8 gap-1.5" onClick={handleNewVersionClick}>
          <Plus className="h-3.5 w-3.5" />
          New Version
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search versions..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>
          <div className="flex items-center gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={statusFilterHandlers[f.value]}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {!filteredVersions.length ? (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="py-14 flex flex-col items-center justify-center gap-3">
              <EmptyDocumentsIllustration className="h-36 w-36 opacity-95" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isFiltered ? "No versions match your filters" : "No handbook versions yet"}
                </p>
                {!isFiltered && (
                  <p className="text-xs text-muted-foreground">
                    Create your first handbook version to get started.
                  </p>
                )}
              </div>
              {!isFiltered && (
                <Button size="sm" className="h-8 gap-1.5 mt-1" onClick={handleNewVersionClick}>
                  <Plus className="h-3.5 w-3.5" />
                  New Version
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVersions.map((v) => (
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
      </div>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editVersion ? "Edit Handbook Version" : "New Handbook Version"}
        description={
          editVersion
            ? "Update the details for this handbook version."
            : "Add a new version of the employee handbook."
        }
        onSubmit={handleSave}
        submitLabel={editVersion ? "Save Changes" : "Create Version"}
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
    <DashboardGate permission="hr:documents:manage">
      <HandbookContent />
    </DashboardGate>
  );
}
