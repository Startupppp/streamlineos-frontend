"use client";

import { useCallback, type ChangeEvent, type KeyboardEvent } from "react";

interface ChatBubbleEditFormProps {
  editInput: string;
  onEditInputChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

export function ChatBubbleEditForm({
  editInput,
  onEditInputChange,
  onSaveEdit,
  onCancelEdit,
}: ChatBubbleEditFormProps) {
  const handleEditInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => onEditInputChange(e.target.value),
    [onEditInputChange],
  );
  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSaveEdit();
      }
      if (e.key === "Escape") onCancelEdit();
    },
    [onSaveEdit, onCancelEdit],
  );

  return (
    <div className="mx-1">
      <div className="rounded-xl border border-primary/40 bg-background overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
        <textarea
          aria-label="Edit message"
          value={editInput}
          onChange={handleEditInputChange}
          onKeyDown={handleEditKeyDown}
          className="w-full bg-transparent text-sm resize-none px-3 py-2 focus:outline-none min-h-[40px]"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 mt-1 px-1">
        <button
          onClick={onCancelEdit}
          className="text-dense text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={onSaveEdit}
          className="text-dense text-primary font-bold hover:underline"
        >
          Save
        </button>
        <span className="text-micro text-muted-foreground ml-auto hidden sm:inline">
          Esc / Enter
        </span>
      </div>
    </div>
  );
}
