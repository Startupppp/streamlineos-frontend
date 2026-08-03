"use client";

import dynamic from "next/dynamic";
import { Textarea } from "@/components/ui/textarea";
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";
import { TicketSubtasks } from "./ticket-subtasks";
import { TicketRelations } from "./ticket-relations";
import { ActivityFeed } from "./activity-feed";
import { TicketActivityLog } from "@/features/build/tickets/ticket-activity-log";
import { TicketChecklists } from "./ticket-checklists";
import { TicketCustomFields } from "./ticket-custom-fields";
import { AttachmentImage } from "./attachment-image";
import {
  TicketDetailAiDescription,
  TicketDetailAiActivityActions,
  useTicketDetailAi,
} from "@/features/build/ai/ticket-detail-ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectMember } from "./types";
import type { Ticket } from "@/types/projects";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
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
  variant?: "full" | "preview";
  onApplyDescription: (html: string) => void;
  onTitleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onDescriptionChange: (html: string) => void;
}

interface AttachmentItem {
  id: number;
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
}

interface AttachmentContextMenuProps {
  attachment: AttachmentItem;
  children: React.ReactNode;
}

function AttachmentContextMenu({ attachment, children }: AttachmentContextMenuProps) {
  function handleView() {
    void viewFile(attachment.fileUrl);
  }

  function handleDownload() {
    void downloadFile(attachment.fileUrl, attachment.fileName);
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(attachment.fileUrl);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={handleView}>
          View image
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleDownload}>
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCopyLink}>
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  variant = "full",
  onApplyDescription,
  onTitleChange,
  onDescriptionChange,
}: TicketDetailMainSectionProps) {
  const isPreview = variant === "preview";
  const ticketDetailAi = useTicketDetailAi({
    projectId,
    ticketId,
    ticket,
    localTitle,
    commentCount: ticket.comments?.length ?? 0,
    onApplyDescription,
  });

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-5">
      <div className="min-w-0">
        <Textarea
          value={localTitle}
          onChange={onTitleChange}
          rows={2}
          className="h-auto w-full max-w-full min-h-0 resize-none break-words border-0 bg-transparent px-0 py-1 text-lg font-semibold leading-snug shadow-none [overflow-wrap:anywhere] [word-break:break-word] hover:border-0 focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-xl"
          placeholder="Ticket title"
        />
      </div>

      <div className="min-w-0">
        {isPreview ? (
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
          output="html"
          minHeightClassName="min-h-[120px] sm:min-h-[160px]"
          placeholder="Add a description..."
        />
      </div>

      {!isPreview && (
        <>
          <TicketSubtasks
            ticketId={ticketId}
            projectId={projectId}
            subtasks={subtasks}
            canUseAI={ticketDetailAi.canUseAI}
          />
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Attachments
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ticket.attachments.map((att) => {
                  if (att.mimeType?.startsWith("image/")) {
                    return (
                      <AttachmentContextMenu key={att.id} attachment={att}>
                        <button
                          type="button"
                          className="group relative aspect-video rounded-md overflow-hidden bg-muted border hover:border-primary/50 transition-all text-left"
                        >
                          <AttachmentImage fileUrl={att.fileUrl} fileName={att.fileName} />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none" />
                        </button>
                      </AttachmentContextMenu>
                    );
                  }
                  return (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => void viewFile(att.fileUrl)}
                      className="group relative aspect-video rounded-md overflow-hidden bg-muted border hover:border-primary/50 transition-all text-left"
                    >
                      <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] p-1 text-center">
                        {att.fileName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <TicketChecklists
            projectId={projectId}
            ticketId={ticketId}
            canUseAI={ticketDetailAi.canUseAI}
            generateChecklistDisabledReason={ticketDetailAi.generateChecklistDisabledReason}
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
        members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
        highlightCommentId={highlightCommentId}
        activityAiActions={
          !isPreview ? (
            <TicketDetailAiActivityActions
              canUseAI={ticketDetailAi.canUseAI}
              summarizeCommentsDisabledReason={ticketDetailAi.summarizeCommentsDisabledReason}
              runSummarizeComments={ticketDetailAi.runSummarizeComments}
              runHandoff={ticketDetailAi.runHandoff}
            />
          ) : null
        }
      />
      <TicketActivityLog ticketId={ticketId} projectId={projectId} />
    </div>
  );
}
