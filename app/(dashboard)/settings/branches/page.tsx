"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus } from "lucide-react";
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
} from "@/lib/api/hooks/branches";
import { toast } from "sonner";
import type { Branch } from "@/types/organization";
import { BranchList } from "@/features/settings/branches/branch-list";
import {
  BranchEditSheet,
  EMPTY_FORM,
  validateBranchForm,
  type BranchFormData,
  type FormErrors,
} from "@/features/settings/branches/branch-edit-sheet";

export default function BranchManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<BranchFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editFormData, setEditFormData] = useState<BranchFormData>({
    ...EMPTY_FORM,
  });
  const [editFormErrors, setEditFormErrors] = useState<FormErrors>({});

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const { data: branchList, isLoading } = useBranches();
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deleteMutation = useDeleteBranch();

  const branches = branchList ?? [];

  useEffect(() => {
    if (editingBranch) {
      setEditFormData({
        name: editingBranch.name ?? "",
        code: editingBranch.code ?? "",
        city: editingBranch.city ?? "",
        state: editingBranch.state ?? "",
        country: editingBranch.country ?? "India",
        pincode: editingBranch.pincode ?? "",
        address: editingBranch.address ?? "",
        phone: editingBranch.phone ?? "",
        email: editingBranch.email ?? "",
      });
      setEditFormErrors({});
    }
  }, [editingBranch]);

  const makeFieldHandler =
    (
      setter: React.Dispatch<React.SetStateAction<BranchFormData>>,
      errorSetter: React.Dispatch<React.SetStateAction<FormErrors>>,
    ) =>
    (key: keyof BranchFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = key === "code" ? e.target.value.toUpperCase() : e.target.value;
      setter((f) => ({ ...f, [key]: value }));
      errorSetter((prev) => ({ ...prev, [key]: undefined }));
    };

  const makeFieldSetter =
    (
      setter: React.Dispatch<React.SetStateAction<BranchFormData>>,
      errorSetter: React.Dispatch<React.SetStateAction<FormErrors>>,
    ) =>
    (key: keyof BranchFormData, value: string) => {
      setter((f) => ({ ...f, [key]: value }));
      errorSetter((prev) => ({ ...prev, [key]: undefined }));
    };

  const createFieldHandler = makeFieldHandler(setFormData, setFormErrors);
  const createFieldSetter = makeFieldSetter(setFormData, setFormErrors);
  const editFieldHandler = makeFieldHandler(setEditFormData, setEditFormErrors);
  const editFieldSetter = makeFieldSetter(setEditFormData, setEditFormErrors);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);

  const handleCloseCreate = useCallback(() => {
    setShowCreate(false);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingBranch(null);
    setEditFormData({ ...EMPTY_FORM });
    setEditFormErrors({});
  }, []);

  const handleCreate = useCallback(() => {
    const validData = validateBranchForm(formData, setFormErrors);
    if (!validData) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    createMutation.mutate(validData, {
      onSuccess: () => {
        toast.success("Branch created");
        handleCloseCreate();
      },
      onError: (err) => toast.error(err.message),
    });
  }, [formData, createMutation, handleCloseCreate]);

  const handleUpdate = useCallback(() => {
    if (!editingBranch) return;
    const validData = validateBranchForm(editFormData, setEditFormErrors);
    if (!validData) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    updateMutation.mutate(
      { id: editingBranch.id, ...validData },
      {
        onSuccess: () => {
          toast.success("Branch updated");
          handleCloseEdit();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }, [editingBranch, editFormData, updateMutation, handleCloseEdit]);

  const handleDelete = useCallback(() => {
    if (!deletingBranch) return;
    deleteMutation.mutate(deletingBranch.id, {
      onSuccess: () => {
        toast.success("Branch deleted");
        setDeletingBranch(null);
      },
      onError: (err) => toast.error(err.message),
    });
  }, [deletingBranch, deleteMutation]);

  const handleCreateSheetChange = useCallback(
    (open: boolean) => {
      if (!open) handleCloseCreate();
      else setShowCreate(true);
    },
    [handleCloseCreate],
  );

  const handleEditSheetChange = useCallback(
    (open: boolean) => {
      if (!open) handleCloseEdit();
    },
    [handleCloseEdit],
  );

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeletingBranch(null);
  }, []);

  return (
    <PageWrapper
      title="Branch Management"
      subtitle="Manage your organization's branch offices"
      badge={branches.length > 0 ? String(branches.length) : undefined}
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      }
    >
      <div className="space-y-6">
        <BranchList
          branches={branches}
          isLoading={isLoading}
          onEdit={setEditingBranch}
          onDelete={setDeletingBranch}
          onCreate={handleOpenCreate}
        />
      </div>

      <BranchEditSheet
        open={showCreate}
        title="Create Branch"
        data={formData}
        errors={formErrors}
        isPending={createMutation.isPending}
        isDisabled={!formData.name || !formData.code}
        onOpenChange={handleCreateSheetChange}
        onFieldChange={createFieldHandler}
        onFieldSet={createFieldSetter}
        onSubmit={handleCreate}
        onCancel={handleCloseCreate}
        submitLabel="Create Branch"
      />

      <BranchEditSheet
        open={!!editingBranch}
        title="Edit Branch"
        data={editFormData}
        errors={editFormErrors}
        isPending={updateMutation.isPending}
        isDisabled={!editFormData.name || !editFormData.code}
        onOpenChange={handleEditSheetChange}
        onFieldChange={editFieldHandler}
        onFieldSet={editFieldSetter}
        onSubmit={handleUpdate}
        onCancel={handleCloseEdit}
        submitLabel="Save Changes"
      />

      <ConfirmDialog
        open={!!deletingBranch}
        onOpenChange={handleDeleteDialogChange}
        title="Delete Branch"
        description={`Are you sure you want to delete "${deletingBranch?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
