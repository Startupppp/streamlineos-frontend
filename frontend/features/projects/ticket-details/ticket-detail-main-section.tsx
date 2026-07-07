"use client";

import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { viewFile } from "@/hooks/common/use-file-url";
import { TicketSubtasks } from "./ticket-subtasks";
import { TicketRelations } from "./ticket-relations";
import { TicketTimeTracker } from "./ticket-time-tracker";
import { WatcherList } from "./watcher-list";
import { ActivityFeed } from "./activity-feed";
import { TicketActivityLog } from "@/features/projects/tickets/ticket-activity-log";
import { TicketChecklists } from "./ticket-checklists";
import { TicketCustomFields } from "./ticket-custom-fields";
import { AttachmentImage } from "./attachment-image";
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
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (html: string) => void;
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
  onTitleChange,
  onDescriptionChange,
}: TicketDetailMainSectionProps) {
  return (
    <div className="space-y-5">
      <Input
        value={localTitle}
        onChange={onTitleChange}
        className="text-xl font-semibold border-0 bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
        placeholder="Ticket title"
      />

      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Description
        </h3>
        <TiptapEditorDynamic
          content={ticket.description ?? ""}
          contentKey={ticketId}
          onChangeHtml={onDescriptionChange}
          output="html"
          minHeightClassName="min-h-[160px]"
          placeholder="Add a description..."
        />
      </div>

      <TicketSubtasks ticketId={ticketId} projectId={projectId} subtasks={subtasks} />

      {ticket.attachments && ticket.attachments.length > 0 && (
        <div>
          <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Attachments
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ticket.attachments.map((att) => (
              <button
                key={att.id}
                type="button"
                onClick={() => viewFile(att.fileUrl)}
                className="group relative aspect-video rounded-md overflow-hidden bg-muted border hover:border-primary/50 transition-all text-left"
              >
                {att.mimeType?.startsWith("image/") ? (
                  <AttachmentImage fileUrl={att.fileUrl} fileName={att.fileName} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] p-1 text-center">
                    {att.fileName}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <TicketChecklists projectId={projectId} ticketId={ticketId} />
      <TicketCustomFields projectId={projectId} ticketId={ticketId} />
      <TicketRelations ticketId={ticketId} projectId={projectId} />
      <TicketTimeTracker
        ticketId={ticketId}
        projectId={projectId}
        timeSpent={ticket.timeSpent ?? null}
      />
      <WatcherList
        projectId={projectId}
        ticketId={ticketId}
        members={members}
      />
      <ActivityFeed
        ticketId={ticketId}
        projectId={projectId}
        projectKey={projectKey}
        ticketNumber={ticket.ticketNumber}
        comments={ticket.comments || []}
        members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
        highlightCommentId={highlightCommentId}
      />
      <TicketActivityLog ticketId={ticketId} projectId={projectId} />
    </div>
  );
}
