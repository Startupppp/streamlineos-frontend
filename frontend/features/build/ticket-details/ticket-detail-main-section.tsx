"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { fadeIn } from "@/lib/motion-variants";
import { TicketSubtasks } from "./ticket-subtasks";
import { TicketRelations } from "./ticket-relations";
import { ActivityFeed } from "./activity-feed";
import { TicketActivityLog } from "@/features/build/tickets/ticket-activity-log";
import { TicketChecklists } from "./ticket-checklists";
import { TicketCustomFields } from "./ticket-custom-fields";
import { TicketQaEvidence } from "./ticket-qa-evidence";
import { AttachmentImage } from "./attachment-image";
import {
  TicketDetailAiDescription,
  TicketDetailAiActivityActions,
  useTicketDetailAi,
} from "@/features/build/ai/ticket-detail-ai";
import { NonImageAttachmentButton, AttachmentContextMenu } from "./ticket-attachment-items";
import { TicketDetailTitleSection } from "./ticket-detail-title-section";
import type { ProjectMember } from "./types";
import type { Ticket } from "@/types/projects";

const TiptapEditorDynamic = dynamic(
  () =>
    import("@/components/editor/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);

interface TicketDetailMainSectionProps {
  ticket: Ticket;
  ticketId: number;
  projectId: number;
  projectKey?: string | null;
  localTitle: string;
  subtasks: Ticket[];
  members: ProjectMember[];
  highlightCommentId?: number | null;
  resumeDraft?: boolean;
  variant?: "full" | "preview";
  onApplyDescription: (html: string) => void;
  onTitleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCommitTitle: (nextTitle: string) => string | null;
  onRevertTitle: () => void;
  onDescriptionChange: (html: string) => void;
  canUpdate: boolean;
}

export function TicketDetailMainSection({
  ticket,
  ticketId,
  projectId,
  projectKey,
  localTitle,
  subtasks,
  members,
  highlightCommentId,
  resumeDraft,
  variant = "full",
  onApplyDescription,
  onTitleChange,
  onCommitTitle,
  onRevertTitle,
  onDescriptionChange,
  canUpdate,
}: TicketDetailMainSectionProps) {
  const isPreview = variant === "preview";
  const reduceMotion = useReducedMotion();
  const ticketDetailAi = useTicketDetailAi({
    projectId,
    ticketId,
    ticket,
    localTitle,
    commentCount: ticket.comments?.length ?? 0,
    onApplyDescription,
  });

  return (
    <motion.div
      className={`mx-auto flex min-h-full w-full min-w-0 flex-col gap-5 ${
        isPreview ? "max-w-none pb-0" : "max-w-4xl pb-6"
      }`}
      initial={isPreview || reduceMotion ? false : "hidden"}
      animate={isPreview || reduceMotion ? undefined : "visible"}
      variants={reduceMotion ? undefined : fadeIn}
    >
      <TicketDetailTitleSection
        ticketId={ticketId}
        localTitle={localTitle}
        canUpdate={canUpdate}
        isPreview={isPreview}
        onTitleChange={onTitleChange}
        onCommitTitle={onCommitTitle}
        onRevertTitle={onRevertTitle}
      />

      <div className="min-w-0 border-b border-border pb-6">
        {isPreview || !canUpdate ? (
          <h3 className="mb-2 text-dense font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </h3>
        ) : (
          <TicketDetailAiDescription
            canUseAI={ticketDetailAi.canUseAI}
            summarizeDisabledReason={ticketDetailAi.summarizeDisabledReason}
            runSummarize={ticketDetailAi.runSummarize}
            descriptionTrigger={ticketDetailAi.descriptionTrigger}
            descriptionInlineSession={ticketDetailAi.descriptionInlineSession}
          />
        )}
        <TiptapEditorDynamic
          content={ticket.description ?? ""}
          contentKey={ticketId}
          onChangeHtml={onDescriptionChange}
          editable={canUpdate}
          imageFolder="build-ticket-images"
          output="html"
          minHeightClassName="min-h-24 sm:min-h-32"
          placeholder="Add a description..."
        />
      </div>

      {!isPreview && (
        <>
          <div className="border-b border-border pb-6">
            <TicketSubtasks
              ticketId={ticketId}
              projectId={projectId}
              subtasks={subtasks}
              parentTicketId={ticket.parentTicketId ?? null}
              canUseAI={ticketDetailAi.canUseAI}
            />
          </div>
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <h4 className="text-dense font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Attachments
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ticket.attachments.map((att) => {
                  if (att.mimeType?.startsWith("image/")) {
                    return (
                      <AttachmentContextMenu key={att.id} attachment={att}>
                        <button
                          type="button"
                          className="group relative aspect-video rounded-md overflow-hidden bg-muted border hover:border-foreground/40 transition-all text-left"
                        >
                          <AttachmentImage
                            fileUrl={att.fileUrl}
                            fileName={att.fileName}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none" />
                        </button>
                      </AttachmentContextMenu>
                    );
                  }
                  return <NonImageAttachmentButton key={att.id} attachment={att} />;
                })}
              </div>
            </div>
          )}
          <div className="border-b border-border pb-6">
            <TicketChecklists
              projectId={projectId}
              ticketId={ticketId}
              canUseAI={ticketDetailAi.canUseAI}
              generateChecklistDisabledReason={
                ticketDetailAi.generateChecklistDisabledReason
              }
            />
          </div>
          <TicketQaEvidence
            projectId={projectId}
            ticketId={ticketId}
            ticketType={ticket.type}
          />
          <TicketCustomFields projectId={projectId} ticketId={ticketId} />
          <TicketRelations ticketId={ticketId} projectId={projectId} />
        </>
      )}

      <ActivityFeed
        ticketId={ticketId}
        projectId={projectId}
        projectKey={projectKey}
        ticketNumber={ticket.ticketNumber}
        comments={ticket.comments || []}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
        }))}
        highlightCommentId={highlightCommentId}
        resumeDraft={resumeDraft}
        activityAiActions={
          !isPreview ? (
            <TicketDetailAiActivityActions
              canUseAI={ticketDetailAi.canUseAI}
              summarizeCommentsDisabledReason={
                ticketDetailAi.summarizeCommentsDisabledReason
              }
              runSummarizeComments={ticketDetailAi.runSummarizeComments}
              runHandoff={ticketDetailAi.runHandoff}
            />
          ) : null
        }
      />
      <TicketActivityLog ticketId={ticketId} projectId={projectId} />
    </motion.div>
  );
}
