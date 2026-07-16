"use client";

import { useState, useCallback } from "react";
import { Copy, CheckCheck, Edit2, Check, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AiGeneratedLabel } from "@/components/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DraftComposerProps {
  draft: string;
  subject?: string;
  generatedAt?: string;
  onAccept?: (finalDraft: string) => void;
  onDiscard?: () => void;
  acceptLabel?: string;
  className?: string;
}

export function DraftComposer({
  draft,
  subject,
  generatedAt,
  onAccept,
  onDiscard,
  acceptLabel = "Accept Draft",
  className,
}: DraftComposerProps) {
  const [editing, setEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState(draft);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(editedDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [editedDraft]);

  const handleEditToggle = useCallback(() => {
    setEditing((prev) => !prev);
  }, []);

  const handleDraftChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDraft(e.target.value);
  }, []);

  const handleAccept = useCallback(() => {
    onAccept?.(editedDraft);
    toast.success("Draft ready to send");
  }, [onAccept, editedDraft]);

  const handleDiscard = useCallback(() => {
    onDiscard?.();
  }, [onDiscard]);

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 space-y-2 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <AiGeneratedLabel timestamp={generatedAt} />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <CheckCheck className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleEditToggle}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-2"
          >
            {editing ? <Check className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {subject && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Subject</p>
          <p className="text-xs text-foreground">{subject}</p>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Body</p>
        {editing ? (
          <Textarea
            value={editedDraft}
            onChange={handleDraftChange}
            className="min-h-[120px] text-xs resize-none"
          />
        ) : (
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{editedDraft}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {onAccept && (
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAccept}>
            <Check className="h-3 w-3" />
            {acceptLabel}
          </Button>
        )}
        {onDiscard && (
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={handleDiscard}>
            <X className="h-3 w-3" />
            Discard
          </Button>
        )}
      </div>
    </div>
  );
}
