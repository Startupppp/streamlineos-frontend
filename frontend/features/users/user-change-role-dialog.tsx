"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useUpdateUserRole } from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { USER_INVITE_ROLES } from "./user-invite-roles";

const changeRoleSchema = z.object({
  role: z.string().min(1, "Please select a role"),
});

type ChangeRoleFormValues = z.infer<typeof changeRoleSchema>;

interface UserChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Pick<User, "id" | "name" | "email" | "role">;
}

export function UserChangeRoleDialog({
  open,
  onOpenChange,
  user,
}: UserChangeRoleDialogProps) {
  const { mutate: updateRole, isPending } = useUpdateUserRole();

  const displayName = user.name ?? user.email;
  const initialRole = USER_INVITE_ROLES.some((r) => r.value === user.role)
    ? user.role
    : "";

  const form = useForm<ChangeRoleFormValues>({
    resolver: zodResolver(changeRoleSchema),
    defaultValues: { role: initialRole },
  });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        form.reset({ role: initialRole });
      }
      onOpenChange(isOpen);
    },
    [form, onOpenChange, initialRole],
  );

  function handleCancel() {
    handleOpenChange(false);
  }

  function onSubmit(values: ChangeRoleFormValues) {
    updateRole(
      { userId: user.id, role: values.role },
      {
        onSuccess: () => {
          const roleLabel =
            USER_INVITE_ROLES.find((r) => r.value === values.role)?.label ??
            values.role;
          toast.success("Role updated", {
            description: `${displayName} is now ${roleLabel}.`,
          });
          handleOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a new role for{" "}
              <span className="font-medium text-foreground">{displayName}</span>.
            </p>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Role <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      {USER_INVITE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isPending} loadingText="Saving…">
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
