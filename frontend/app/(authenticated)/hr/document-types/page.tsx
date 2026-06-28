"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, AlertCircle } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentTypeList } from "@/features/hr/document-types/document-type-list";
import { DocumentTypeFormDialog } from "@/features/hr/document-types/document-type-form-dialog";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAbility } from "@/lib/abilities-context";

interface DocumentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
  createdAt: string | null;
}

function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: queryKeys.hr.documentTypes(),
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
  });
}

function useCreateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      isMandatory: boolean;
      sortOrder?: number;
      applicableRoles: string[];
    }) => {
      return apiClient.post("/hr/document-types", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTypes() });
    },
  });
}

function useUpdateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      name?: string;
      description?: string;
      isMandatory?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      applicableRoles?: string[];
    }) => {
      return apiClient.patch(`/hr/document-types/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTypes() });
    },
  });
}

function useDeleteDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient.patch(`/hr/document-types/${id}`, { isActive: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTypes() });
    },
  });
}

interface FormState {
  name: string;
  description: string;
  isMandatory: boolean;
  isActive: boolean;
  sortOrder: string;
  applicableRoles: string[];
}

function blankForm(): FormState {
  return {
    name: "",
    description: "",
    isMandatory: false,
    isActive: true,
    sortOrder: "",
    applicableRoles: [],
  };
}

export default function DocumentTypesPage() {
  const ability = useAbility();
  const isHROrCEO = ability.can("manage", "hr:employees");

  const { data, isLoading, isError, refetch } = useDocumentTypes();
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DocumentType | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

  const [deactivateTarget, setDeactivateTarget] =
    useState<DocumentType | null>(null);
  const [reactivateTarget, setReactivateTarget] =
    useState<DocumentType | null>(null);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleToggleRole = useCallback((r: string) => {
    setForm((prev) => ({
      ...prev,
      applicableRoles: prev.applicableRoles.includes(r)
        ? prev.applicableRoles.filter((x) => x !== r)
        : [...prev.applicableRoles, r],
    }));
  }, []);

  const resetAndClose = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
    setForm(blankForm());
  }, []);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(blankForm());
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((dt: DocumentType) => {
    setEditTarget(dt);
    setForm({
      name: dt.name,
      description: dt.description ?? "",
      isMandatory: dt.isMandatory ?? false,
      isActive: dt.isActive !== false,
      sortOrder: dt.sortOrder != null ? String(dt.sortOrder) : "",
      applicableRoles: dt.applicableRoles ?? [],
    });
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }
    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    if (trimmedName.length > 100) {
      toast.error("Name must be at most 100 characters");
      return;
    }
    const trimmedDesc = form.description.trim();
    if (trimmedDesc.length > 500) {
      toast.error("Description must be at most 500 characters");
      return;
    }

    const payload = {
      name: trimmedName,
      description: trimmedDesc || undefined,
      isMandatory: form.isMandatory,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      applicableRoles: form.applicableRoles,
    };

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, ...payload, isActive: form.isActive },
        {
          onSuccess: () => {
            toast.success("Document type updated");
            resetAndClose();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Document type created");
          resetAndClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [form, editTarget, createMutation, updateMutation, resetAndClose]);

  const handleDeactivate = useCallback(() => {
    if (!deactivateTarget) return;
    deleteMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success("Document type deactivated");
        setDeactivateTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deactivateTarget, deleteMutation]);

  const handleReactivate = useCallback(() => {
    if (!reactivateTarget) return;
    updateMutation.mutate(
      { id: reactivateTarget.id, isActive: true },
      {
        onSuccess: () => {
          toast.success("Document type reactivated");
          setReactivateTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [reactivateTarget, updateMutation]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetAndClose();
      else setSheetOpen(true);
    },
    [resetAndClose],
  );

  const handleDeactivateDialogChange = useCallback((open: boolean) => {
    if (!open) setDeactivateTarget(null);
  }, []);

  const handleReactivateDialogChange = useCallback((open: boolean) => {
    if (!open) setReactivateTarget(null);
  }, []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const list = data ?? [];

  if (isLoading) {
    return (
      <PageWrapper
        title="Document Types"
        subtitle="Configure required onboarding documents"
      >
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Document Types" subtitle="Configure required onboarding documents">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load document types</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Document Types"
      subtitle="Configure required onboarding documents"
      badge={`${list.length} types`}
      actions={
        isHROrCEO ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Document Type
          </Button>
        ) : undefined
      }
    >
      <DocumentTypeList
        items={list}
        isHROrCEO={isHROrCEO}
        onEdit={openEdit}
        onDeactivate={setDeactivateTarget}
        onReactivate={setReactivateTarget}
        onCreateClick={openCreate}
      />

      <DocumentTypeFormDialog
        open={sheetOpen}
        isEditing={!!editTarget}
        form={form}
        isPending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={handleSheetOpenChange}
        onSetField={setField}
        onToggleRole={handleToggleRole}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={handleDeactivateDialogChange}
        title="Deactivate Document Type"
        description={`Are you sure you want to deactivate "${deactivateTarget?.name}"? It will no longer appear in new onboarding checklists.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={handleDeactivate}
        isPending={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={reactivateTarget !== null}
        onOpenChange={handleReactivateDialogChange}
        title="Reactivate Document Type"
        description={`Are you sure you want to reactivate "${reactivateTarget?.name}"? It will appear again in new onboarding checklists.`}
        confirmLabel="Reactivate"
        onConfirm={handleReactivate}
        isPending={updateMutation.isPending}
      />
    </PageWrapper>
  );
}
