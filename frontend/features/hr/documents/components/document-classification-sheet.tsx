"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DocumentKbLinkPanel } from "./document-kb-link-panel";
import { DocumentVersionsPanel } from "./document-versions-panel";
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

type AudienceFields = Pick<ClassificationFormValues, "audienceMode" | "departmentIds" | "locationIds">;

/** A save that stopped part-way. `classificationSaved` says the first of its two requests went through. */
interface SubmitFailure {
  error: unknown;
  classificationSaved: boolean;
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
  const [submitFailure, setSubmitFailure] = useState<SubmitFailure | null>(null);
  // The audience the person is saving, kept until it is saved or the sheet closes. The classification request lands
  // first and refreshes the view the form is reset from, so without this a failed audience request would put the
  // old audience back and the person would have to choose it all again.
  const unsavedAudience = useRef<{ documentId: number; audience: AudienceFields } | null>(null);

  const form = useForm<ClassificationFormValues>({
    resolver: zodResolver(classificationFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const loaded = view.data;
  useEffect(() => {
    if (!open) {
      unsavedAudience.current = null;
      return;
    }
    if (!loaded) return;
    form.reset(formValuesFromView(loaded));
    const unsaved = unsavedAudience.current;
    if (unsaved && unsaved.documentId === loaded.documentId) {
      // Still dirty against the server, so Save stays meaningful and closing still warns; the error stays on screen.
      form.setValue("audienceMode", unsaved.audience.audienceMode, { shouldDirty: true });
      form.setValue("departmentIds", unsaved.audience.departmentIds, { shouldDirty: true });
      form.setValue("locationIds", unsaved.audience.locationIds, { shouldDirty: true });
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitFailure(null);
  }, [open, loaded, form]);

  const blockers = useMemo(() => otherBlockers(loaded), [loaded]);

  const onSubmit = useCallback(
    async (values: ClassificationFormValues) => {
      if (!document || !loaded) return;
      setSubmitFailure(null);
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

      unsavedAudience.current = audienceChanged
        ? {
            documentId: document.id,
            audience: { audienceMode: values.audienceMode, departmentIds: values.departmentIds, locationIds: values.locationIds },
          }
        : null;
      let linksTakenDown = 0;
      let classificationSaved = false;
      try {
        if (classificationChanged || dateChanged) {
          const result = await classify.mutateAsync({
            documentId: document.id,
            classification: values.classification,
            effectiveDate,
          });
          linksTakenDown = result.linksTakenDown;
          classificationSaved = true;
        }
        if (audienceChanged) await setAudiences.mutateAsync({ documentId: document.id, audiences });
      } catch (error) {
        setSubmitFailure({ error, classificationSaved });
        toast.error(getErrorMessage(error));
        return;
      }
      unsavedAudience.current = null;
      toast.success(
        `"${document.name}" is now ${classificationOption(values.classification).label.toLowerCase()}.${
          linksTakenDown > 0 ? ` ${takenDownMessage(linksTakenDown)}` : ""
        }`,
      );
      // A document just made shareable stays open: adding it to the Knowledge Base is the next step, and it is right below.
      if (!shareable) onOpenChange(false);
    },
    [classify, document, loaded, onOpenChange, setAudiences],
  );

  const isPending = classify.isPending || setAudiences.isPending;
  const handleSubmit = useCallback(() => form.handleSubmit(onSubmit)(), [form, onSubmit]);

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
            {submitFailure !== null ? (
              <Alert variant="destructive">
                <AlertTitle>{submitFailure.classificationSaved ? "The audience was not saved" : "Not saved"}</AlertTitle>
                <AlertDescription>
                  <p>{getErrorMessage(submitFailure.error)}</p>
                  {submitFailure.classificationSaved ? (
                    <p>The classification was saved. The audience you chose is still selected: save again to retry it.</p>
                  ) : null}
                  <ErrorReference error={submitFailure.error} className="mt-2 justify-start" />
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </Form>
      )}
      {loaded && document ? (
        <div className="mt-6 flex flex-col gap-4">
          <DocumentKbLinkPanel documentId={document.id} documentName={document.name} />
          <DocumentVersionsPanel documentId={document.id} />
        </div>
      ) : null}
    </HrSheet>
  );
}
