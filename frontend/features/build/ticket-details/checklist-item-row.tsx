"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/api/build/checklists";
import type { ChecklistItem } from "@/types/projects";

function DeleteItemButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-status-danger-ink hover:text-status-danger-ink hover:bg-status-danger-surface transition-all"
      aria-label="Delete item"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={12} />
    </button>
  );
}

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  checklistId,
  projectId,
  ticketId,
  canUpdate,
}: {
  item: ChecklistItem;
  checklistId: number;
  projectId: number;
  ticketId: number;
  canUpdate: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateItem = useUpdateChecklistItem(projectId, ticketId);
  const deleteItem = useDeleteChecklistItem(projectId, ticketId);

  const handleToggle = useCallback(() => {
    updateItem.mutate(
      { checklistId, itemId: item.id, isCompleted: !item.isCompleted },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [item.id, item.isCompleted, checklistId, updateItem]);

  const handleTextSave = useCallback(() => {
    if (text.trim() && text !== item.text) {
      updateItem.mutate(
        { checklistId, itemId: item.id, text: text.trim() },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
    } else {
      setText(item.text);
    }
    setEditing(false);
  }, [text, item.text, item.id, checklistId, updateItem]);

  const handleDelete = useCallback(() => {
    deleteItem.mutate(
      { checklistId, itemId: item.id },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [item.id, checklistId, deleteItem]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleTextSave();
      if (e.key === "Escape") {
        setText(item.text);
        setEditing(false);
      }
    },
    [handleTextSave, item.text],
  );

  const handleSpanKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === "Enter") setEditing(true);
    },
    [],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-2 py-1 px-1 rounded-md hover:bg-muted/50 transition-colors"
    >
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-all duration-150",
          item.isCompleted
            ? "bg-status-success-fill border-status-success-rule"
            : "border-input hover:border-primary/40",
        )}
        aria-label={item.isCompleted ? "Mark incomplete" : "Mark complete"}
        disabled={!canUpdate}
      >
        {item.isCompleted && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            viewBox="0 0 10 8"
            fill="none"
            className="h-2.5 w-2.5"
          >
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </button>

      {canUpdate && editing ? (
        <input
          ref={inputRef}
          aria-label="Checklist item text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleTextSave}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm bg-transparent border-b border-input outline-none py-0.5"
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm",
            canUpdate && "cursor-pointer",
            item.isCompleted
              ? "line-through text-muted-foreground"
              : "text-foreground",
          )}
          onClick={canUpdate ? () => setEditing(true) : undefined}
          onKeyDown={canUpdate ? handleSpanKeyDown : undefined}
          role={canUpdate ? "button" : undefined}
          tabIndex={canUpdate ? 0 : undefined}
        >
          {item.text}
        </span>
      )}

      {canUpdate ? <DeleteItemButton onClick={handleDelete} /> : null}
    </motion.div>
  );
});
