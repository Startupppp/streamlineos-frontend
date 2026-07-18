"use client";

import { useState, useCallback, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Plus, AlertCircle } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentTypeList } from "@/features/hr/document-types/document-type-list";
import {
  DocumentTypeFormDialog,
  type DocumentTypeFormData,
} from "@/features/hr/document-types/document-type-form-dialog";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

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

interface PaginatedDocumentTypes {
  data: DocumentType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT_OPTIONS = [10, 20, 50] as const;
type LimitOption = (typeof LIMIT_OPTIONS)[number];

function isValidLimit(n: number): n is LimitOption {
  return (LIMIT_OPTIONS as readonly number[]).includes(n);
}

function useDocumentTypes(page: number, limit: number) {
  return useQuery<PaginatedDocumentTypes>({
    queryKey: [...queryKeys.hr.documentTypes(), { page, limit }] as const,
    queryFn: () =>
      apiClient.get<PaginatedDocumentTypes>("/hr/document-types", { page, limit }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

function useCreateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "documentTypes", "create"],
    mutationFn: (body: DocumentTypeFormData) =>
      apiClient.post("/hr/document-types", {
        name: body.name,
        description: body.description,
        isMandatory: body.isMandatory,
        sortOrder: body.sortOrder,
        applicableRoles: body.applicableRoles,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTypes() });
    },
  });
}

function useUpdateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "documentTypes", "update"],
    mutationFn: ({
      id,
      ...body
    }: { id: number } & Partial<DocumentTypeFormData>) =>
      apiClient.patch(`/hr/document-types/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTypes() });
    },
  });
}

function useDeleteDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["hr", "documentTypes", "delete"],
    mutationFn: (id: number) =>
      apiClient.patch(`/hr/document-types/${id}`, { isActive: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.documentTypes() });
    },
  });
}

export default function DocumentTypesPage() {
  const isHROrCEO = useCan("hr:employees:manage");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const page = Number(searchParams.get("page")) || 1;
  const limitParam = Number(searchParams.get("limit"));
  const limit: LimitOption = isValidLimit(limitParam) ? limitParam : 20;

  const { data, isLoading, isError, refetch } = useDocumentTypes(page, limit);
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DocumentType | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DocumentType | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<DocumentType | null>(null);

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const handlePageChange = useCallback(
    (p: number) => pushParams({ page: p <= 1 ? null : String(p) }),
    [pushParams],
  );

  const handleLimitChange = useCallback(
    (l: number) => pushParams({ limit: l === 20 ? null : String(l), page: null }),
    [pushParams],
  );

  const resetAndClose = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
  }, []);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((dt: DocumentType) => {
    setEditTarget(dt);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetAndClose();
      else setSheetOpen(true);
    },
    [resetAndClose],
  );

  const handleFormSubmit = useCallback(
    (formData: DocumentTypeFormData) => {
      if (editTarget) {
        updateMutation.mutate(
          { id: editTarget.id, ...formData },
          {
            onSuccess: () => {
              toast.success("Document type updated");
              resetAndClose();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createMutation.mutate(formData, {
          onSuccess: () => {
            toast.success("Document type created");
            resetAndClose();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      }
    },
    [editTarget, createMutation, updateMutation, resetAndClose],
  );

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

  const handleDeactivateDialogChange = useCallback((open: boolean) => {
    if (!open) setDeactivateTarget(null);
  }, []);

  const handleReactivateDialogChange = useCallback((open: boolean) => {
    if (!open) setReactivateTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const list = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const editDefaults = editTarget
    ? {
        name: editTarget.name,
        description: editTarget.description ?? "",
        isMandatory: editTarget.isMandatory ?? false,
        isActive: editTarget.isActive !== false,
        sortOrder: editTarget.sortOrder ?? undefined,
        applicableRoles: editTarget.applicableRoles ?? [],
      }
    : undefined;

  if (isLoading) {
    return (
      <PageWrapper
        title="Document Types"
        subtitle="Configure required onboarding documents"
 variant="display">
        <Skeleton className="flex-1 rounded-lg" />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Document Types" subtitle="Configure required onboarding documents" variant="display">
        <div className="flex flex-1 flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-8 text-destructive" />
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
      actions={
        isHROrCEO ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Document Type
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <DocumentTypeList
          items={list}
          isHROrCEO={isHROrCEO}
          onEdit={openEdit}
          onDeactivate={setDeactivateTarget}
          onReactivate={setReactivateTarget}
          onCreateClick={openCreate}
        />
        {total > 0 && (
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </div>

      <DocumentTypeFormDialog
        open={sheetOpen}
        isEditing={!!editTarget}
        defaultValues={editDefaults}
        isPending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={handleSheetOpenChange}
        onSubmit={handleFormSubmit}
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
