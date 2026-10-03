"use client";

import { useForm, Controller } from "react-hook-form";
import type { ControllerRenderProps, ControllerFieldState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { MemberPicker } from "@/components/members/member-picker";
import { useAddProjectMember } from "@/hooks/api/build/project-members";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  addProjectMemberSchema,
  type AddProjectMemberFormValues,
} from "./add-project-member-schema";

interface AddProjectMemberDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProjectMemberDialog({
  projectId,
  open,
  onOpenChange,
}: AddProjectMemberDialogProps) {
  const addMember = useAddProjectMember();

  const form = useForm<AddProjectMemberFormValues>({
    resolver: zodResolver(addProjectMemberSchema),
    defaultValues: { userId: "", role: "MEMBER" },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleCancel() {
    handleOpenChange(false);
  }

  function handleAddSuccess() {
    toast.success("Added to project.");
    handleOpenChange(false);
  }

  function handleAddError(e: unknown) {
    if (isWriteConflict(e)) {
      toast.error("This person is already a member of this project.");
    } else {
      toast.error(getErrorMessage(e));
    }
  }

  function handleSubmit(values: AddProjectMemberFormValues) {
    addMember.mutate(
      { projectId, userId: values.userId, role: values.role },
      { onSuccess: handleAddSuccess, onError: handleAddError },
    );
  }

  function renderMemberField({
    field,
    fieldState,
  }: {
    field: ControllerRenderProps<AddProjectMemberFormValues, "userId">;
    fieldState: ControllerFieldState;
  }) {
    function handleMemberChange(id: string | null) {
      field.onChange(id ?? "");
    }
    return (
      <>
        <MemberPicker
          mode="single"
          moduleKey="build"
          excludeAssigned={false}
          enabled={open}
          value={field.value || undefined}
          onChange={handleMemberChange}
          placeholder="Select a member…"
        />
        {fieldState.error ? (
          <p className="text-xs text-destructive" role="alert">
            {fieldState.error.message}
          </p>
        ) : null}
      </>
    );
  }

  function renderRoleField({
    field,
  }: {
    field: ControllerRenderProps<AddProjectMemberFormValues, "role">;
  }) {
    return (
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger id="add-project-member-role" className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="MEMBER">Member</SelectItem>
          <SelectItem value="VIEWER">Viewer</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add project member</DialogTitle>
          <DialogDescription>
            Give someone direct access to this project.
          </DialogDescription>
        </DialogHeader>
        <form
          id="add-project-member-form"
          aria-label="Add project member"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-3 py-1"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="add-project-member-picker"
            >
              Member
            </label>
            <Controller
              control={form.control}
              name="userId"
              render={renderMemberField}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="add-project-member-role"
            >
              Role
            </label>
            <Controller
              control={form.control}
              name="role"
              render={renderRoleField}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="add-project-member-form"
            size="sm"
            isPending={addMember.isPending}
            loadingText="Adding…"
          >
            Add to project
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
