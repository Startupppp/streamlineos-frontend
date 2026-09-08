"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Plus, AlertCircle } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { DocumentTypeList } from "@/features/hr/document-types/document-type-list";
import {
  DocumentTypeFormDialog,
  type DocumentTypeFormData,
} from "@/features/hr/document-types/document-type-form-dialog";

import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useCreateHrDocumentType,
  useDeactivateHrDocumentType,
  useHrDocumentTypesPage,
  useUpdateHrDocumentType,
  type HrDocumentType,
} from "@/hooks/api/hr/document-types";

const LIMIT_OPTIONS = [10, 20, 50] as const;
type LimitOption = (typeof LIMIT_OPTIONS)[number];

function isValidLimit(n: number): n is LimitOption {
  return LIMIT_OPTIONS.some((candidate) => candidate === n);
}

export function DocumentTypesPage() {
  const canManageDocuments = useCan("hr:documents:manage");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const limitParam = Number(searchParams.get("limit"));
  const limit: LimitOption = isValidLimit(limitParam) ? limitParam : 20;

  const pager = useCursorPager(String(limit));
  const { data, isLoading, isError, refetch } = useHrDocumentTypesPage(pager.cursor, limit);
  const createMutation = useCreateHrDocumentType();
  const updateMutation = useUpdateHrDocumentType();
  const deactivateMutation = useDeactivateHrDocumentType();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrDocumentType | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<HrDocumentType | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<HrDocumentType | null>(null);

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

  const handleLimitChange = useCallback(
    (l: number) => pushParams({ limit: l === 20 ? null : String(l) }),
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

  const openEdit = useCallback((documentType: HrDocumentType) => {
    setEditTarget(documentType);
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
          { documentTypeId: editTarget.id, ...formData },
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
    deactivateMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success("Document type deactivated");
        setDeactivateTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deactivateTarget, deactivateMutation]);

  const handleReactivate = useCallback(() => {
    if (!reactivateTarget) return;
    updateMutation.mutate(
      { documentTypeId: reactivateTarget.id, isActive: true },
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
  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;

  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor);
  }, [pager, nextCursor]);

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
      >
        <Skeleton className="flex-1 rounded-lg" />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Document Types" subtitle="Configure required onboarding documents">
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
        canManageDocuments ? (
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
          canManageDocuments={canManageDocuments}
          onEdit={openEdit}
          onDeactivate={setDeactivateTarget}
          onReactivate={setReactivateTarget}
          onCreateClick={openCreate}
        />
        <DataTablePagination
          mode="cursor"
          limit={limit}
          rowCount={list.length}
          hasMore={hasMore}
          hasPrevious={pager.hasPrevious}
          onNext={handleNextPage}
          onPrevious={pager.goPrevious}
          onLimitChange={handleLimitChange}
        />
      </div>

      <DocumentTypeFormDialog
        open={sheetOpen}
        isEditing={!!editTarget}
        defaultValues={editDefaults}
        isPending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={handleSheetOpenChange}
        onSubmit={handleFormSubmit}
      />

      <ConfirmSheet
        open={deactivateTarget !== null}
        onOpenChange={handleDeactivateDialogChange}
        title="Deactivate Document Type"
        description={`Are you sure you want to deactivate "${deactivateTarget?.name}"? It will no longer appear in new onboarding checklists.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={handleDeactivate}
        isPending={deactivateMutation.isPending}
      />

      <ConfirmSheet
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
