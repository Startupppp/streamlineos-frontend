"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useForm, useDeleteForm, useSubmitForm } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { FORM_TYPE_LABELS } from "./field-type-meta";
import { DynamicFormRenderer } from "./dynamic-form-renderer";
import {
  FormBuilderTab,
  FormBuilderTabSkeleton,
} from "./components/form-builder-tab";
import { FormSubmissionsTab } from "./components/form-submissions-tab";

interface FormDetailPageProps {
  projectId: number;
  formId: number;
}

export function FormDetailPage({ projectId, formId }: FormDetailPageProps) {
  const router = useRouter();
  const canManage = useCan("projects:forms:manage");
  const shouldReduceMotion = useReducedMotion();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  const {
    data: form,
    isLoading,
    isError,
    refetch,
  } = useForm(projectId, formId);
  const deleteForm = useDeleteForm(projectId);
  const submitForm = useSubmitForm(projectId, formId);

  function handleDeleteConfirm() {
    deleteForm.mutate(formId, {
      onSuccess: () => {
        toast.success("Form deleted");
        router.push(`/projects/${projectId}/forms`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handlePreviewSubmit(
    values: Record<string, unknown>,
    submittedByName?: string,
  ) {
    submitForm.mutate(
      { values, submittedByName },
      {
        onSuccess: () => {
          toast.success("Test submission recorded");
          setPreviewSubmitted(true);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handlePreviewOpenChange(open: boolean) {
    setPreviewOpen(open);
    if (!open) setPreviewSubmitted(false);
  }

  function handlePreviewAgain() {
    setPreviewSubmitted(false);
  }

  function handlePreviewOpen() {
    setPreviewOpen(true);
  }

  function handleDeleteOpen() {
    setDeleteOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <PageWrapper
        title="Form"
        backHref={`/projects/${projectId}/forms`}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4 pt-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <FormBuilderTabSkeleton />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !form) {
    return (
      <PageWrapper
        title="Form"
        backHref={`/projects/${projectId}/forms`}
      >
        <ErrorState onRetry={handleRetry} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={form.name}
      backHref={`/projects/${projectId}/forms`}
      actions={
        <div className="flex items-center gap-2">
          <Badge
            variant={form.isActive ? "default" : "secondary"}
            className="text-xs"
          >
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {FORM_TYPE_LABELS[form.type]}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={handlePreviewOpen}
          >
            Preview / Fill
          </Button>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-destructive hover:text-destructive border-destructive/30"
              onClick={handleDeleteOpen}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.22,
          ease: "easeOut",
        }}
      >
        <Tabs defaultValue="builder">
          <TabsList>
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <FormBuilderTab projectId={projectId} formId={formId} />
          </TabsContent>

          <TabsContent value="submissions">
            <FormSubmissionsTab projectId={projectId} formId={formId} />
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={previewOpen} onOpenChange={handlePreviewOpenChange}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview — {form.name}</DialogTitle>
          </DialogHeader>
          {previewSubmitted ? (
            <EmptyState
              compact
              illustrationPreset="approval"
              title="Submitted!"
              description="Your test submission was recorded successfully."
              action={{ label: "Submit another", onClick: handlePreviewAgain }}
            />
          ) : (
            <DynamicFormRenderer
              fields={form.fields}
              projectId={projectId}
              onSubmit={handlePreviewSubmit}
              isPending={submitForm.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              All submissions will be permanently deleted. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
