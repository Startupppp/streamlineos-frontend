"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateRole } from "@/hooks/api/roles";
import type { Role } from "@/types/organization";

const renameRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

type FormValues = z.infer<typeof renameRoleSchema>;

interface RenameRoleDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

export function RenameRoleDialog({
  role,
  open,
  onOpenChange,
}: RenameRoleDialogProps) {
  const updateRole = useUpdateRole(role?.id ?? 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(renameRoleSchema),
    defaultValues: { name: role?.name ?? "" },
  });

  const { reset, handleSubmit, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (open) {
      reset({ name: role?.name ?? "" });
    }
  }, [open, role?.name, reset]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset],
  );

  const handleClose = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  const onSubmit = useCallback(
    (values: FormValues) => {
      updateRole.mutate(
        { name: values.name.trim() },
        {
          onSuccess: () => {
            toast.success("Role renamed");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateRole, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename role</DialogTitle>
          <DialogDescription className="text-xs">
            Enter a new display name for this role.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Role name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Finance Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateRole.isPending || isSubmitting}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={updateRole.isPending || isSubmitting}
                loadingText="Saving…"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
