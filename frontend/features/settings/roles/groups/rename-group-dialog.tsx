"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRenameGroup, type PrincipalGroup } from "@/hooks/api/principal-groups";
import { createGroupSchema, type CreateGroupFormValues } from "./create-group-schema";

interface RenameGroupDialogProps {
  group: PrincipalGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameGroupDialog({ group, open, onOpenChange }: RenameGroupDialogProps) {
  const renameGroup = useRenameGroup(group?.id ?? "");
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: group?.name ?? "" },
    values: { name: group?.name ?? "" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset({ name: group?.name ?? "" });
    onOpenChange(next);
  };

  const onSubmit = (values: CreateGroupFormValues) => {
    renameGroup.mutate(values, {
      onSuccess: () => {
        toast.success("Group renamed");
        handleOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename group</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      className="h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={renameGroup.isPending}
                loadingText="Saving…"
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
