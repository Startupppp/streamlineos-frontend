"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Lock } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon } from "@animateicons/react/lucide";
import { useCaseNotes, useCaseDocuments, useAddCaseNote } from "@/hooks/api/hr/cases";
import { useCan } from "@/hooks/api/access";
import { formatDistanceToNow } from "date-fns";

function AddNoteButton({
  isPending,
  disabled,
  onClick,
}: {
  isPending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      isPending={isPending}
      onClick={onClick}
      disabled={disabled}
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={12} className="mr-1" />
      Add Note
    </LoadingButton>
  );
}

export function NoteThread({ caseId }: { caseId: number }) {
  const { data: notes, isLoading } = useCaseNotes(caseId);
  const addNote = useAddCaseNote(caseId);
  // POST /hr/cases/:id/notes is @RequirePermission("hr:cases:manage").
  const canAddNote = useCan("hr:cases:manage");
  const [text, setText] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);

  function handleAdd() {
    if (!text.trim()) return;
    addNote.mutate({ note: text.trim(), isConfidential }, {
      onSuccess: () => setText(""),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
  }

  if (isLoading) return (
    <div className="space-y-2 pt-1">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
    </div>
  );

  return (
    <div className="space-y-3">
      {notes?.map((note) => (
        <div
          key={note.id}
          className={cn(
            "rounded-lg border p-3 text-sm",
            note.isConfidential ? "border-status-warning-rule bg-status-warning-surface" : "bg-muted/30",
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
            </span>
            {note.isConfidential && (
              <Badge variant="outline" className="text-status-warning-ink border-status-warning-rule text-xs gap-1">
                <Lock className="h-3 w-3" />
                Confidential
              </Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note}</p>
        </div>
      ))}

      {canAddNote && (
      <div className="space-y-2 pt-2">
        <Textarea
          rows={3}
          placeholder="Add a note..."
          value={text}
          onChange={handleTextChange}
          className="text-sm"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={isConfidential} onCheckedChange={setIsConfidential} className="scale-75" />
            <span>Confidential</span>
          </div>
          <AddNoteButton
            isPending={addNote.isPending}
            onClick={handleAdd}
            disabled={!text.trim()}
          />
        </div>
      </div>
      )}
    </div>
  );
}

export function DocumentsList({ caseId }: { caseId: number }) {
  const { data: docs, isLoading } = useCaseDocuments(caseId);

  if (isLoading) return (
    <div className="space-y-2 pt-1">
      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
    </div>
  );
  if (!docs?.length) return <p className="text-xs text-muted-foreground">No documents attached</p>;

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <a
          key={doc.id}
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-muted/50 transition-colors"
        >
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 truncate">{doc.name}</span>
          {doc.restricted && (
            <Lock className="h-3 w-3 text-status-warning-ink shrink-0" />
          )}
        </a>
      ))}
    </div>
  );
}
