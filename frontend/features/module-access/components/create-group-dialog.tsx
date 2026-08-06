"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateModuleRoleGroup } from "@/hooks/api/module-access";
import {
  createGroupSchema,
  type CreateGroupInput,
} from "@/features/module-access/module-access-schema";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  onCreated: (id: number) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  moduleKey,
  onCreated,
}: CreateGroupDialogProps) {
  const mutation = useCreateModuleRoleGroup(moduleKey);
  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "" },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset();
      onOpenChange(next);
    },
    [form, onOpenChange],
  );

  function handleSubmit(values: CreateGroupInput) {
    mutation.mutate(values, {
      onSuccess: (group) => {
        toast.success(`Role group "${group.name}" created`);
        form.reset();
        onOpenChange(false);
        onCreated(group.id);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create role group</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Group name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Read-only viewers"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                isPending={mutation.isPending}
                loadingText="Creating…"
              >
                Create
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
