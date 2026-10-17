"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { useCreateNpsSurvey, useUpdateNpsSurvey } from "@/hooks/api/crm/nps-surveys";
import type { NpsSurvey } from "@/hooks/api/crm/nps-surveys-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { NpsSurveyFormFields } from "./nps-survey-form-fields";
import { npsSurveyFormSchema, type NpsSurveyFormValues } from "./nps-survey-schema";

const NEW_SURVEY: NpsSurveyFormValues = {
  title: "",
  question: "How likely are you to recommend us to a friend or colleague?",
};

interface NpsSurveyDialogProps {
  /** `null` creates a survey; a survey edits it. Mounted only while open. */
  survey: NpsSurvey | null;
  onClose: () => void;
}

export function NpsSurveyDialog({ survey, onClose }: NpsSurveyDialogProps) {
  const create = useCreateNpsSurvey();
  const update = useUpdateNpsSurvey();

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleSubmit = (values: NpsSurveyFormValues) => {
    const callbacks = {
      onSuccess: () => {
        toast.success(survey ? "Survey updated" : "Survey created as a draft");
        onClose();
      },
      onError: (error: Error) => toast.error(getErrorMessage(error)),
    };
    if (survey) update.mutate({ surveyId: survey.id, ...values }, callbacks);
    else create.mutate(values, callbacks);
  };

  return (
    <EntityFormDialog<NpsSurveyFormValues>
      open
      onOpenChange={handleOpenChange}
      title={survey ? "Edit survey" : "New NPS survey"}
      description={
        survey
          ? undefined
          : "Surveys start as drafts. Activate one to start collecting responses through its link."
      }
      resolver={zodResolver(npsSurveyFormSchema)}
      defaultValues={survey ? { title: survey.title, question: survey.question } : NEW_SURVEY}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending || update.isPending}
      submitLabel={survey ? "Save survey" : "Create survey"}
    >
      {(form) => <NpsSurveyFormFields form={form} />}
    </EntityFormDialog>
  );
}
