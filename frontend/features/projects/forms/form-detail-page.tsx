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
import { Separator } from "@/components/ui/separator";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useForm, useUpdateForm, useDeleteForm, useSubmitForm } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CreateFormInput, UpdateFormInput } from "@/types/projects/forms";
import { FORM_TYPE_LABELS } from "./field-type-meta";
import { FormBuilder } from "./form-builder";
import { DynamicFormRenderer } from "./dynamic-form-renderer";
import { SubmissionsSection } from "./submissions-section";

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

  const { data: form, isLoading, isError, refetch } = useForm(projectId, formId);
  const updateForm = useUpdateForm(projectId);
  const deleteForm = useDeleteForm(projectId);
  const submitForm = useSubmitForm(projectId, formId);

  function handleSave(data: CreateFormInput | UpdateFormInput) {
    updateForm.mutate(
      { id: formId, ...data },
      {
        onSuccess: () => toast.success("Form saved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleDeleteConfirm() {
    deleteForm.mutate(formId, {
      onSuccess: () => {
        toast.success("Form deleted");
        router.push(`/projects/${projectId}/forms`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handlePreviewSubmit(values: Record<string, unknown>, submittedByName?: string) {
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

  if (isLoading) {
    return (
      <PageWrapper title="Form" eyebrow="Project" backHref={`/projects/${projectId}/forms`}>
        <div className="px-4 pb-4 space-y-4">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !form) {
    return (
      <PageWrapper title="Form" eyebrow="Project" backHref={`/projects/${projectId}/forms`}>
        <div className="px-4 pb-4">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={form.name}
      eyebrow={`FORM-${form.formNumber}`}
      backHref={`/projects/${projectId}/forms`}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={form.isActive ? "default" : "secondary"} className="text-xs">
            {form.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {FORM_TYPE_LABELS[form.type]}
          </Badge>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setPreviewOpen(true)}>
            Preview / Fill
          </Button>
          {canManage && (
            <Button
              size="sm" variant="outline"
              className="h-8 text-xs text-destructive hover:text-destructive border-destructive/30"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <motion.div
        className="px-4 pb-10 space-y-8"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
      >
        <div className="max-w-2xl">
          <FormBuilder
            form={form}
            onSave={handleSave}
            isPending={updateForm.isPending}
            readOnly={!canManage}
          />
        </div>

        <Separator />

        <SubmissionsSection projectId={projectId} formId={formId} />
      </motion.div>

      <Dialog open={previewOpen} onOpenChange={handlePreviewOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              All submissions will be permanently deleted. This cannot be undone.
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
