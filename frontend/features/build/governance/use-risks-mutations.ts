"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
} from "@/hooks/api/build/governance";
import { getErrorMessage } from "@/lib/get-error-message";
import { getValidationFieldErrors, type ValidationFieldError } from "@/lib/api-envelope";
import type { Risk, CreateRiskInput, UpdateRiskInput } from "@/types/projects";

export function useRisksMutations(projectId: number) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Risk | null>(null);
  const [riskFieldErrors, setRiskFieldErrors] = useState<readonly ValidationFieldError[]>([]);

  const createRisk = useCreateRisk(projectId);
  const updateRisk = useUpdateRisk(projectId);
  const deleteRisk = useDeleteRisk(projectId);

  const handleCreate = useCallback(
    (input: CreateRiskInput) => {
      createRisk.mutate(input, {
        onSuccess: () => {
          setRiskFieldErrors([]);
          toast.success("Risk added");
          setSheetOpen(false);
        },
        onError: (e) => {
          const fieldErrors = getValidationFieldErrors(e);
          if (fieldErrors.length > 0) {
            setRiskFieldErrors(fieldErrors);
          } else {
            toast.error(getErrorMessage(e));
          }
        },
      });
    },
    [createRisk],
  );

  const handleUpdate = useCallback(
    (input: UpdateRiskInput & { riskId: number }) => {
      updateRisk.mutate(input, {
        onSuccess: () => {
          setRiskFieldErrors([]);
          toast.success("Risk updated");
          setEditRisk(null);
        },
        onError: (e) => {
          const fieldErrors = getValidationFieldErrors(e);
          if (fieldErrors.length > 0) {
            setRiskFieldErrors(fieldErrors);
          } else {
            toast.error(getErrorMessage(e));
          }
        },
      });
    },
    [updateRisk],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteRisk.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Risk deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteRisk, deleteTarget]);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSheetOpen(false);
      setEditRisk(null);
    }
  }, []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleEditRow = useCallback((r: Risk) => setEditRisk(r), []);
  const handleDeleteRow = useCallback((r: Risk) => setDeleteTarget(r), []);
  const handleNewRisk = useCallback(() => setSheetOpen(true), []);

  return {
    sheetOpen,
    editRisk,
    deleteTarget,
    riskFieldErrors,
    createRisk,
    updateRisk,
    deleteRisk,
    handleCreate,
    handleUpdate,
    handleDeleteConfirm,
    handleSheetOpenChange,
    handleAlertOpenChange,
    handleEditRow,
    handleDeleteRow,
    handleNewRisk,
  };
}
