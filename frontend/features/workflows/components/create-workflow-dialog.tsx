"use client";

import { useRouter } from "next/navigation";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateWorkflow } from "@/hooks/api/workflows";
import {
  createWorkflowSchema,
  type CreateWorkflowValues,
} from "@/features/workflows/create-workflow-schema";

interface CreateWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkflowDialog({ open, onClose }: CreateWorkflowDialogProps) {
  const router = useRouter();
  const create = useCreateWorkflow();

  const form = useForm<CreateWorkflowValues>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: { name: "", description: "" },
  });

  function handleSubmit(values: CreateWorkflowValues) {
    create.mutate(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: (data) => {
          toast.success("Workflow created");
          form.reset();
          onClose();
          router.push(`/workflows/${data.id}/builder`);
        },
        onError: () => toast.error("Failed to create workflow"),
      }
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      onClose();
    }
  }

  const handleFormSubmit = form.handleSubmit(handleSubmit);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Lead Assignment Flow"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What does this workflow do?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={create.isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={create.isPending}
                loadingText="Creating…"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
              >
                {"Create & Open Builder"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
