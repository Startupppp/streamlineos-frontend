"use client";

import dynamic from "next/dynamic";
import type { Control } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateTicketAiFieldTrigger } from "@/features/build/ai/create-ticket-ai-menu";
import { AiInlinePreview, type AiInlineSession } from "@/components/ai";
import { AttachmentPreview } from "./ticket-attachment-preview";
import { TicketRelatedLinksEditor, type RelatedLinkDraft } from "./ticket-related-links-editor";
import type { CreateTicketFormValues } from "./use-create-ticket-form";

const TiptapEditorDynamic = dynamic(
  () =>
    import("@/components/editor/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] animate-pulse rounded-md border border-border bg-muted/40" />
    ),
  },
);

interface AiTriggerProps {
  label: string;
  disabledReason?: string;
  disabled?: boolean;
  isPending?: boolean;
  onClick: () => void;
}

interface TicketDialogDescriptionSectionProps {
  control: Control<CreateTicketFormValues>;
  descriptionEditorKey: number;
  canUseAI: boolean;
  descriptionTriggerProps: AiTriggerProps;
  descriptionInlineSession: AiInlineSession | null;
  files: File[];
  previewUrls: (string | null)[];
  onRemoveFile: (idx: number) => void;
  showLinksEditor: boolean;
  relatedLinks: RelatedLinkDraft[];
  onRelatedLinksChange: (links: RelatedLinkDraft[]) => void;
  selectedProjectId: number | null;
  projectKey: string | undefined;
  fileError: string | null;
}

export function TicketDialogDescriptionSection({
  control,
  descriptionEditorKey,
  canUseAI,
  descriptionTriggerProps,
  descriptionInlineSession,
  files,
  previewUrls,
  onRemoveFile,
  showLinksEditor,
  relatedLinks,
  onRelatedLinksChange,
  selectedProjectId,
  projectKey,
  fileError,
}: TicketDialogDescriptionSectionProps) {
  function makeRemoveFileHandler(idx: number) {
    return function removeFile() {
      onRemoveFile(idx);
    };
  }

  return (
    <ScrollArea
      hideScrollbar
      className="min-h-[120px] flex-1"
      viewportClassName="overscroll-contain px-5 py-3"
    >
      <FormField
        control={control}
        name="description"
        render={({ field }) => {
          function handleDescriptionHtmlChange(html: string) {
            field.onChange(html);
          }
          return (
            <FormItem className="min-h-[120px]">
              <div className="relative min-h-[120px] cursor-text">
                {canUseAI ? (
                  <div className="absolute right-0 top-0 z-10">
                    <CreateTicketAiFieldTrigger
                      {...descriptionTriggerProps}
                    />
                  </div>
                ) : null}
                <TiptapEditorDynamic
                  content={field.value ?? ""}
                  contentKey={descriptionEditorKey}
                  onChangeHtml={handleDescriptionHtmlChange}
                  output="html"
                  minHeightClassName="min-h-[120px]"
                  placeholder="Add description…"
                  embedded
                />
              </div>
              <FormMessage className="text-xs" />
              {descriptionInlineSession ? (
                <AiInlinePreview
                  session={descriptionInlineSession}
                  applyLabel="Replace"
                  previewMode="description"
                  className="mt-2"
                />
              ) : null}
            </FormItem>
          );
        }}
      />

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((file, idx) => (
            <AttachmentPreview
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              previewUrl={previewUrls[idx] ?? null}
              onRemove={makeRemoveFileHandler(idx)}
            />
          ))}
        </div>
      )}

      {(showLinksEditor || relatedLinks.length > 0) && (
        <div className="mt-3">
          <p className="mb-1.5 text-dense font-medium text-muted-foreground">
            Related links
          </p>
          <TicketRelatedLinksEditor
            links={relatedLinks}
            onChange={onRelatedLinksChange}
            projectId={selectedProjectId}
            projectKey={projectKey}
          />
        </div>
      )}

      {fileError && (
        <p className="mt-2 text-dense text-destructive">
          {fileError}
        </p>
      )}
    </ScrollArea>
  );
}
