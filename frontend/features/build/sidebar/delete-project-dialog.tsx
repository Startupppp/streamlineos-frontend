"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDeleteProject } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { clearLastProjectId } from "@/lib/projects/last-project";
import {
  createDeleteProjectConfirmSchema,
  type DeleteProjectConfirmValues,
} from "./delete-project-confirm-schema";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onDeleted?: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onDeleted,
}: DeleteProjectDialogProps) {
  const deleteProject = useDeleteProject();
  const schema = useMemo(
    () => createDeleteProjectConfirmSchema(projectName),
    [projectName],
  );

  const form = useForm<DeleteProjectConfirmValues>({
    resolver: zodResolver(schema),
    defaultValues: { confirmName: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) {
      form.reset({ confirmName: "" });
    }
  }, [open, projectName, form]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (deleteProject.isPending) return;
      onOpenChange(next);
    },
    [onOpenChange, deleteProject.isPending],
  );

  const handleSubmit = useCallback(
    () => {
      deleteProject.mutate(
        { projectId },
        {
          onSuccess: () => {
            clearLastProjectId();
            toast.success("Project deleted");
            onOpenChange(false);
            onDeleted?.();
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [deleteProject, projectId, onOpenChange, onDeleted],
  );

  const confirmMatches = form.watch("confirmName") === projectName;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <span className="font-semibold text-foreground">{projectName}</span>{" "}
            and all of its tickets and data. Type the project name to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="confirmName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {projectName}
                    </span>{" "}
                    to confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      disabled={deleteProject.isPending}
                      placeholder={projectName}
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteProject.isPending}>
                Cancel
              </AlertDialogCancel>
              <LoadingButton
                type="submit"
                variant="destructive"
                isPending={deleteProject.isPending}
                disabled={!confirmMatches || deleteProject.isPending}
                loadingText="Deleting…"
              >
                Delete
              </LoadingButton>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
