import { useState, useCallback } from "react";
import {
  useCreateManagedProduct,
  useDeleteManagedProduct,
  useArchiveManagedProduct,
  useRestoreManagedProduct,
} from "@/hooks/api/build/managed-products";
import { toast } from "sonner";
import type { ManagedProduct, CreateManagedProductInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";

interface UseManagedProductMutationsProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreateSuccess: () => void;
}

export function useManagedProductMutations({
  canCreate,
  canUpdate,
  canDelete,
  onCreateSuccess,
}: UseManagedProductMutationsProps) {
  const [deleteTarget, setDeleteTarget] = useState<ManagedProduct | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ManagedProduct | null>(null);

  const createProduct = useCreateManagedProduct();
  const deleteProduct = useDeleteManagedProduct();
  const archiveProduct = useArchiveManagedProduct();
  const restoreProduct = useRestoreManagedProduct();

  const handleCreate = useCallback(
    (input: CreateManagedProductInput) => {
      if (!canCreate) return;
      createProduct.mutate(input, {
        onSuccess: () => {
          toast.success("Managed product created");
          onCreateSuccess();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [canCreate, createProduct, onCreateSuccess],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!canDelete || !deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Managed product deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [canDelete, deleteProduct, deleteTarget]);

  const handleArchiveConfirm = useCallback(() => {
    if (!canUpdate || !archiveTarget) return;
    archiveProduct.mutate(
      { managedProductId: archiveTarget.id, version: archiveTarget.version },
      {
        onSuccess: () => {
          toast.success("Managed product archived");
          setArchiveTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [canUpdate, archiveProduct, archiveTarget]);

  const handleRestoreRow = useCallback(
    (row: ManagedProduct) => {
      if (!canUpdate) return;
      restoreProduct.mutate(
        { managedProductId: row.id, version: row.version },
        {
          onSuccess: () => toast.success("Managed product restored"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [canUpdate, restoreProduct],
  );

  const handleDeleteRow = useCallback(
    (row: ManagedProduct) => {
      if (canDelete) setDeleteTarget(row);
    },
    [canDelete],
  );

  const handleArchiveRow = useCallback(
    (row: ManagedProduct) => {
      if (canUpdate) setArchiveTarget(row);
    },
    [canUpdate],
  );

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleArchiveDialogChange = useCallback((open: boolean) => {
    if (!open) setArchiveTarget(null);
  }, []);

  return {
    deleteTarget,
    archiveTarget,
    createProductIsPending: createProduct.isPending,
    handleCreate,
    handleDeleteConfirm,
    handleArchiveConfirm,
    handleRestoreRow,
    handleDeleteRow,
    handleArchiveRow,
    handleDeleteDialogChange,
    handleArchiveDialogChange,
  };
}
