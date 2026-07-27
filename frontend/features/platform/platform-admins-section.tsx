"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import {
  usePlatformAdmins,
  useAddPlatformAdmin,
  useRemovePlatformAdmin,
  type PlatformAdmin,
} from "@/hooks/api/platform-admins";
import { addAdminSchema, type AddAdminFormValues } from "./add-admin-schema";

function AdminRow({ admin, onRemove, isRemoving }: {
  admin: PlatformAdmin;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  function handleRemoveClick() {
    setConfirming(true);
  }

  function handleCancelClick() {
    setConfirming(false);
  }

  function handleConfirmClick() {
    onRemove(admin.id);
    setConfirming(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-[14px] truncate">
          {getUserDisplayName({ name: admin.name, email: admin.email })}
        </p>
        <p className="text-[12px] text-slate-500 mt-0.5 truncate">{admin.email}</p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-slate-500">Remove?</span>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-[12px]"
            disabled={isRemoving}
            onClick={handleConfirmClick}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[12px]"
            onClick={handleCancelClick}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[12px] shrink-0"
          onClick={handleRemoveClick}
        >
          Remove
        </Button>
      )}
    </div>
  );
}

export function PlatformAdminsSection() {
  const { data: admins, isLoading, isError } = usePlatformAdmins();
  const addAdmin = useAddPlatformAdmin();
  const removeAdmin = useRemovePlatformAdmin();

  const form = useForm<AddAdminFormValues>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: { email: "" },
  });

  function handleAdd(values: AddAdminFormValues) {
    addAdmin.mutate(values, {
      onSuccess: () => {
        toast.success("Platform admin added.");
        form.reset();
      },
      onError: (err) => {
        if (isApiError(err) && err.status === 409) {
          toast.error("This user is already a platform admin.");
        } else if (isApiError(err) && err.status === 404) {
          toast.error("No user found with that email address.");
        } else {
          toast.error(getErrorMessage(err));
        }
      },
    });
  }

  function handleRemove(userId: string) {
    removeAdmin.mutate(userId, {
      onSuccess: () => {
        toast.success("Platform admin removed.");
      },
      onError: (err) => {
        if (isApiError(err) && err.status === 409) {
          toast.error("Cannot remove the last platform admin.");
        } else {
          toast.error(getErrorMessage(err));
        }
      },
    });
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={form.handleSubmit(handleAdd)}
        className="flex items-start gap-2"
      >
        <div className="flex-1 min-w-0">
          <Input
            {...form.register("email")}
            placeholder="user@example.com"
            className="h-9"
            type="email"
            autoComplete="email"
          />
          {form.formState.errors.email && (
            <p className="text-[12px] text-destructive mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <LoadingButton
          type="submit"
          size="sm"
          className="h-9 shrink-0"
          isPending={addAdmin.isPending}
          loadingText="Adding…"
        >
          Add admin
        </LoadingButton>
      </form>

      {isLoading && (
        <div className="space-y-2.5">
          <Skeleton className="h-[58px] w-full rounded-2xl" />
          <Skeleton className="h-[58px] w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-slate-500">
          Failed to load platform admins.
        </div>
      )}

      {!isLoading && !isError && admins && admins.length === 0 && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-slate-500">
          No platform admins yet.
        </div>
      )}

      {!isLoading && !isError && admins && admins.length > 0 && (
        <div className="space-y-2.5">
          {admins.map((admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              onRemove={handleRemove}
              isRemoving={removeAdmin.isPending && removeAdmin.variables === admin.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
