"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { HrSheet } from "@/components/shared/hr-sheet";
import { ErrorReference } from "@/components/shared/error-reference";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import {
  useClassifyDocument,
  useDocumentClassification,
  useSetDocumentAudiences,
  type DocumentClassificationView,
} from "@/hooks/api/hr/document-classification";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Document } from "@/types/hr";
import { DocumentClassificationFormFields } from "./document-classification-form-fields";
import {
  audiencesFromForm,
  classificationFormSchema,
  classificationOption,
  formValuesFromView,
  sameAudiences,
  type ClassificationFormValues,
} from "./document-classification-model";

interface DocumentClassificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const EMPTY_VALUES: ClassificationFormValues = {
  classification: "PERSONAL",
  effectiveDate: "",
  audienceMode: "HR_ONLY",
  departmentIds: [],
  locationIds: [],
};

function otherBlockers(view: DocumentClassificationView | undefined) {
  return (view?.blockers ?? []).filter((blocker) => blocker.code !== "CLASSIFICATION_NOT_SHAREABLE");
}

function takenDownMessage(count: number): string {
  return count === 1 ? "1 Knowledge Base entry was taken down." : `${count} Knowledge Base entries were taken down.`;
}

/**
 * Classify a document and say who it is for. Saving does two things at most, in this order: the
 * classification (and effective date), then the audience. The audience is only sent for a class that can be
 * shared and only when it changed, and the server has the last word on both: a personal file cannot be made
 * shareable whatever this form says.
 */
export function DocumentClassificationSheet({ open, onOpenChange, document }: DocumentClassificationSheetProps) {
  const canPublish = useCan("hr:documents:publish");
  const view = useDocumentClassification(document?.id ?? null, { enabled: open });
  const classify = useClassifyDocument();
  const setAudiences = useSetDocumentAudiences();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const form = useForm<ClassificationFormValues>({
    resolver: zodResolver(classificationFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const loaded = view.data;
  useEffect(() => {
    if (open && loaded) {
      form.reset(formValuesFromView(loaded));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmitError(null);
    }
  }, [open, loaded, form]);

  const blockers = useMemo(() => otherBlockers(loaded), [loaded]);

  const onSubmit = useCallback(
    async (values: ClassificationFormValues) => {
      if (!document || !loaded) return;
      setSubmitError(null);
      const audiences = audiencesFromForm(values);
      const effectiveDate = values.effectiveDate === "" ? null : values.effectiveDate;
      const classificationChanged = values.classification !== loaded.classification;
      const dateChanged = effectiveDate !== loaded.effectiveDate;
      const shareable = classificationOption(values.classification).shareable;
      const audienceChanged = shareable && !sameAudiences(audiences, loaded.audiences);

      if (!classificationChanged && !dateChanged && !audienceChanged) {
        onOpenChange(false);
        return;
      }

      let linksTakenDown = 0;
      try {
        if (classificationChanged || dateChanged) {
          const result = await classify.mutateAsync({
            documentId: document.id,
            classification: values.classification,
            effectiveDate,
          });
          linksTakenDown = result.linksTakenDown;
        }
        if (audienceChanged) await setAudiences.mutateAsync({ documentId: document.id, audiences });
      } catch (error) {
        setSubmitError(error);
        toast.error(getErrorMessage(error));
        return;
      }
      toast.success(
        `"${document.name}" is now ${classificationOption(values.classification).label.toLowerCase()}.${
          linksTakenDown > 0 ? ` ${takenDownMessage(linksTakenDown)}` : ""
        }`,
      );
      onOpenChange(false);
    },
    [classify, document, loaded, onOpenChange, setAudiences],
  );

  const isPending = classify.isPending || setAudiences.isPending;
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Classification and sharing"
      description={document ? `Decide what "${document.name}" is and who may see it in the Knowledge Base.` : undefined}
      onSubmit={handleSubmit}
      submitLabel="Save"
      isPending={isPending}
      submitDisabled={!loaded}
      isDirty={form.formState.isDirty}
    >
      {view.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load the classification of this document</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(view.error)}</p>
            <ErrorReference error={view.error} className="mt-2 justify-start" />
          </AlertDescription>
        </Alert>
      ) : !loaded ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <Form {...form}>
          <div className="flex flex-col gap-6">
            {blockers.length > 0 ? (
              <Alert>
                <AlertTitle>This document cannot be shared</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {blockers.map((blocker) => (
                      <li key={blocker.code}>{blocker.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            <DocumentClassificationFormFields canPublish={canPublish} sharingBlocked={blockers.length > 0} />
            {submitError !== null ? (
              <Alert variant="destructive">
                <AlertTitle>Not saved</AlertTitle>
                <AlertDescription>
                  <p>{getErrorMessage(submitError)}</p>
                  <ErrorReference error={submitError} className="mt-2 justify-start" />
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </Form>
      )}
    </HrSheet>
  );
}
