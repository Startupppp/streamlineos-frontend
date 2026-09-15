"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateChecklist,
  useDeleteChecklist,
  useCreateChecklistItem,
} from "@/hooks/api/build/checklists";
import type { Checklist } from "@/types/projects";
import { ChecklistItemRow } from "./checklist-item-row";


function DeleteChecklistButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-status-danger-ink hover:text-status-danger-ink hover:bg-status-danger-surface transition-all"
      aria-label="Delete checklist"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={12} />
    </button>
  );
}

export function ChecklistSection({
  checklist,
  projectId,
  ticketId,
  canUpdate,
}: {
  checklist: Checklist;
  projectId: number;
  ticketId: number;
  canUpdate: boolean;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(checklist.title);

  const updateChecklist = useUpdateChecklist(projectId, ticketId);
  const deleteChecklist = useDeleteChecklist(projectId, ticketId);
  const createItem = useCreateChecklistItem(projectId, ticketId);

  const completed = (checklist.items ?? []).filter((i) => i.isCompleted).length;
  const total = (checklist.items ?? []).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleTitleSave = useCallback(() => {
    if (title.trim() && title !== checklist.title) {
      updateChecklist.mutate(
        { checklistId: checklist.id, title: title.trim() },
        {
          onError: (e) => {
            toast.error(getErrorMessage(e));
            setTitle(checklist.title);
          },
        },
      );
    } else {
      setTitle(checklist.title);
    }
    setEditingTitle(false);
  }, [title, checklist.title, checklist.id, updateChecklist]);

  const handleAddItem = useCallback(() => {
    if (!newItemText.trim()) return;
    createItem.mutate(
      { checklistId: checklist.id, text: newItemText.trim(), order: total },
      {
        onSuccess: () => {
          setNewItemText("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [newItemText, checklist.id, total, createItem]);

  const handleDeleteChecklist = useCallback(() => {
    deleteChecklist.mutate(checklist.id, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [checklist.id, deleteChecklist]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleTitleSave();
      if (e.key === "Escape") {
        setTitle(checklist.title);
        setEditingTitle(false);
      }
    },
    [handleTitleSave, checklist.title],
  );

  const handleTitleSpanKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === "Enter") setEditingTitle(true);
    },
    [],
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleAddItem();
      if (e.key === "Escape") {
        setAddingItem(false);
        setNewItemText("");
      }
    },
    [handleAddItem],
  );

  const handleItemBlur = useCallback(() => {
    if (!newItemText.trim()) setAddingItem(false);
  }, [newItemText]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 group">
        <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
        {canUpdate && editingTitle ? (
          <input
            aria-label="Checklist title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-sm font-semibold bg-transparent border-b border-input outline-none"
            autoFocus
          />
        ) : (
          <span
            className={cn("flex-1 text-sm font-semibold text-foreground", canUpdate && "cursor-pointer hover:text-foreground/80")}
            onClick={canUpdate ? () => setEditingTitle(true) : undefined}
            onKeyDown={canUpdate ? handleTitleSpanKeyDown : undefined}
            role={canUpdate ? "button" : undefined}
            tabIndex={canUpdate ? 0 : undefined}
          >
            {checklist.title}
          </span>
        )}
        <span className="text-micro text-muted-foreground font-mono">
          {completed}/{total}
        </span>
        {canUpdate ? <DeleteChecklistButton onClick={handleDeleteChecklist} /> : null}
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden ml-6">
          <motion.div
            className="h-full w-full origin-left bg-status-success-fill rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      <div className="ml-6 space-y-0.5">
        <AnimatePresence initial={false}>
          {(checklist.items ?? []).map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              checklistId={checklist.id}
              projectId={projectId}
              ticketId={ticketId}
              canUpdate={canUpdate}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {canUpdate && addingItem ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex items-center gap-2 pt-1"
            >
              <div className="h-4 w-4 shrink-0 rounded border-2 border-input" />
              <input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={handleItemKeyDown}
                placeholder="Add item..."
                className="flex-1 text-sm bg-transparent border-b border-input outline-none py-0.5 placeholder:text-muted-foreground"
                autoFocus
                onBlur={handleItemBlur}
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItemText.trim()}
                className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-40"
              >
                Add
              </button>
            </motion.div>
          ) : canUpdate ? (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 mt-1"
            >
              <PlusIcon size={12} />
              Add item
            </button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
