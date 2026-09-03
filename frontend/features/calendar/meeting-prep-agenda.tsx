"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AiCitationChips } from "@/components/ai/ai-citation-chips";
import type { AgendaCitation } from "@/hooks/api/meetings-ai";
import type { MeetingAgendaSections } from "./meeting-prep-stream-parse";

interface MeetingPrepAgendaProps {
  sections: MeetingAgendaSections;
  citations: AgendaCitation[];
  isStreaming: boolean;
}

/**
 * The structured agenda the user sees, rendered from whatever the stream has
 * delivered so far. Every branch is guarded on its own content rather than on
 * completion, so the four affordances appear one at a time as the model reaches
 * them instead of all at once at the end.
 */
export function MeetingPrepAgendaBody({ sections, isStreaming }: Omit<MeetingPrepAgendaProps, "citations">) {
  return (
    <div className="space-y-2" aria-busy={isStreaming || undefined}>
      <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
        {sections.agenda}
        {isStreaming && (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 bg-foreground motion-safe:animate-pulse"
          />
        )}
      </p>
      {sections.preparationNotes && (
        <>
          <Separator />
          <div className="flex items-start gap-1.5">
            <ClipboardList
              className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
              {sections.preparationNotes}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function MeetingPrepAgendaDetails({
  sections,
  citations,
}: Omit<MeetingPrepAgendaProps, "isStreaming">) {
  return (
    <>
      {sections.keyTopics.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Key topics
          </p>
          <div className="flex flex-wrap gap-1">
            {sections.keyTopics.map((topic, index) => (
              <Badge key={`${String(index)}-${topic}`} variant="secondary" className="text-micro h-5 px-1.5">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {sections.suggestedDuration && (
        <p className="text-xs text-muted-foreground">
          Suggested duration:{" "}
          <span className="font-medium text-foreground">{sections.suggestedDuration}</span>
        </p>
      )}

      {citations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sources
          </p>
          <AiCitationChips
            citations={citations.map((c) => ({
              id: c.id,
              title: c.title,
              snippet: c.snippet,
            }))}
          />
        </div>
      )}
    </>
  );
}
