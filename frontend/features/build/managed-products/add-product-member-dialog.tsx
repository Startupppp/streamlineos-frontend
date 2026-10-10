"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import type { ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useAddManagedProductMember } from "@/hooks/api/build/managed-product-members";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const addMemberSchema = z.object({
  membershipId: z.number().int().positive({ message: "Select a member" }),
  role: z.enum(["member", "admin"]),
});
type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddProductMemberDialogProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductMemberDialog({
  managedProductId,
  open,
  onOpenChange,
}: AddProductMemberDialogProps) {
  const [search, setSearch] = useState("");
  const { data: buildMembers } = useBuildMembers(
    { limit: 50, search: search || undefined },
    { enabled: open },
  );
  const addMember = useAddManagedProductMember(managedProductId);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { membershipId: 0, role: "member" },
  });

  const memberOptions = useMemo(
    () =>
      (buildMembers?.data ?? []).map((m) => ({
        membershipId: m.membershipId,
        label: m.name ?? m.email,
      })),
    [buildMembers],
  );

  function handleOpenChange(next: boolean) {
    if (!next && addMember.isPending) return;
    if (!next) {
      form.reset();
      setSearch("");
    }
    onOpenChange(next);
  }

  function handleSubmit(values: AddMemberFormValues) {
    if (addMember.isPending) return;
    addMember.mutate(
      { organizationMembershipId: values.membershipId, role: values.role },
      {
        onSuccess: () => {
          toast.success("Member added.");
          form.reset();
          setSearch("");
          onOpenChange(false);
        },
        onError: (e) => {
          if (isWriteConflict(e)) {
            toast.error("This person is already a member of this product.");
          } else {
            toast.error(getErrorMessage(e));
          }
        },
      },
    );
  }

  const renderMemberField = useCallback(
    ({ field }: { field: ControllerRenderProps<AddMemberFormValues, "membershipId"> }) => (
      <div className="flex flex-col gap-1.5">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={addMember.isPending}
          className="h-9"
        />
        <Select
          value={field.value > 0 ? String(field.value) : ""}
          onValueChange={(v) => field.onChange(Number(v))}
          disabled={addMember.isPending}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a member" />
          </SelectTrigger>
          <SelectContent>
            {memberOptions.map((m) => (
              <SelectItem key={m.membershipId} value={String(m.membershipId)}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.membershipId ? (
          <p className="text-xs text-destructive" role="alert">
            {form.formState.errors.membershipId.message}
          </p>
        ) : null}
      </div>
    ),
    [search, addMember.isPending, memberOptions, form.formState.errors.membershipId],
  );

  const renderRoleField = useCallback(
    ({ field }: { field: ControllerRenderProps<AddMemberFormValues, "role"> }) => (
      <Select value={field.value} onValueChange={field.onChange} disabled={addMember.isPending}>
        <SelectTrigger id="add-product-member-role" className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="member">Member</SelectItem>
        </SelectContent>
      </Select>
    ),
    [addMember.isPending],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add product member</DialogTitle>
          <DialogDescription>Give someone access to this product.</DialogDescription>
        </DialogHeader>
        <form
          id="add-product-member-form"
          aria-label="Add product member"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-3 py-1"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Member</label>
            <Controller control={form.control} name="membershipId" render={renderMemberField} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="add-product-member-role">
              Role
            </label>
            <Controller control={form.control} name="role" render={renderRoleField} />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="add-product-member-form"
            size="sm"
            isPending={addMember.isPending}
            loadingText="Adding…"
          >
            Add member
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
