"use client";

import { useState, useEffect, useCallback } from "react";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import type { Citation } from "@/components/ai";
import { cn } from "@/lib/utils";

interface DraftComposerProps {
  draft: string;
  title?: string;
  timestamp?: string | Date;
  confidence?: number;
  citations?: Citation[];
  onAccept: (finalDraft: string) => void;
  onDiscard: () => void;
  isAcceptPending?: boolean;
  acceptLabel?: string;
  placeholder?: string;
  className?: string;
}

export function DraftComposer({
  draft,
  title,
  timestamp,
  confidence,
  citations,
  onAccept,
  onDiscard,
  isAcceptPending,
  acceptLabel,
  placeholder,
  className,
}: DraftComposerProps) {
  const [editedDraft, setEditedDraft] = useState(draft);

  useEffect(() => {
    setEditedDraft(draft);
  }, [draft]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDraft(e.target.value);
  }, []);

  const handleAccept = useCallback(() => {
    onAccept(editedDraft);
  }, [onAccept, editedDraft]);

  return (
    <AiDraftCard
      title={title}
      timestamp={timestamp}
      confidence={confidence}
      citations={citations}
      onAccept={handleAccept}
      onDiscard={onDiscard}
      acceptLabel={acceptLabel}
      isAcceptPending={isAcceptPending}
      className={cn(className)}
    >
      <div>
        <textarea
          value={editedDraft}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full min-h-[100px] resize-y rounded-md border border-input bg-background px-2.5 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground mt-1">{editedDraft.length} chars</p>
      </div>
    </AiDraftCard>
  );
}
