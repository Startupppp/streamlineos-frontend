"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { useCreateGroup } from "@/hooks/api/principal-groups";
import { createGroupSchema, type CreateGroupFormValues } from "./create-group-schema";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const createGroup = useCreateGroup();
  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "" },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    onOpenChange(next);
  };

  const onSubmit = (values: CreateGroupFormValues) => {
    createGroup.mutate(values, {
      onSuccess: () => {
        toast.success("Group created");
        handleOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New permission group</DialogTitle>
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
                      placeholder="e.g. Engineering Leads"
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
                isPending={createGroup.isPending}
                loadingText="Creating…"
              >
                Create group
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
