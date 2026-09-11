"use client";

import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ArDocumentView, TaxPreview } from "@/types/accounting-ar";
import { ArDocumentForm } from "./ar-document-form";
import { TaxPreviewPanel } from "./tax-preview-panel";
import {
  arDocumentFormFromView,
  arDocumentFormSchema,
  type ArDocumentFormValues,
} from "./ar-document-schema";

export interface DraftPreviewState {
  data: TaxPreview | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

interface ArDraftEditorProps {
  arDocument: ArDocumentView;
  onSave: (values: ArDocumentFormValues) => Promise<void>;
  isSaving: boolean;
  errorLineIndex?: number;
  preview: DraftPreviewState;
  saveLabel?: string;
  actions?: ReactNode;
}

export function ArDraftEditor({
  arDocument,
  onSave,
  isSaving,
  errorLineIndex,
  preview,
  saveLabel = "Save changes",
  actions,
}: ArDraftEditorProps) {
  const form = useForm<ArDocumentFormValues>({
    resolver: zodResolver(arDocumentFormSchema),
    defaultValues: arDocumentFormFromView(arDocument),
  });

  function handleSubmit(values: ArDocumentFormValues): void {
    void onSave(values)
      .then(() => form.reset(values))
      .catch(() => undefined);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start"
      >
        <ArDocumentForm form={form} errorLineIndex={errorLineIndex} disabled={isSaving} />

        <div className="flex flex-col gap-4 lg:sticky lg:top-0">
          <TaxPreviewPanel
            preview={preview.data}
            currency={arDocument.currency}
            isLoading={preview.isLoading}
            isFetching={preview.isFetching}
            isStale={form.formState.isDirty}
            error={preview.error}
          />
          <div className="flex flex-col gap-2">
            <LoadingButton type="submit" isPending={isSaving} className="w-full">
              {saveLabel}
            </LoadingButton>
            {actions}
          </div>
        </div>
      </form>
    </Form>
  );
}
