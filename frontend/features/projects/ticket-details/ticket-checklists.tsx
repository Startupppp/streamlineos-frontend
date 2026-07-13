"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useChecklists,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/api/projects/checklists";
import type { Checklist, ChecklistItem } from "@/types/projects";

interface TicketChecklistsProps {
  projectId: number;
  ticketId: number;
}

const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  checklistId,
  projectId,
  ticketId,
}: {
  item: ChecklistItem;
  checklistId: number;
  projectId: number;
  ticketId: number;
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
            ? "bg-emerald-500 border-emerald-500"
            : "border-input hover:border-primary/40",
        )}
        aria-label={item.isCompleted ? "Mark incomplete" : "Mark complete"}
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

      {editing ? (
        <input
          ref={inputRef}
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
            "flex-1 text-sm cursor-pointer",
            item.isCompleted
              ? "line-through text-muted-foreground"
              : "text-foreground",
          )}
          onClick={() => setEditing(true)}
          onKeyDown={handleSpanKeyDown}
          role="button"
          tabIndex={0}
        >
          {item.text}
        </span>
      )}

      <button
        type="button"
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
        aria-label="Delete item"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </motion.div>
  );
});

function ChecklistSection({
  checklist,
  projectId,
  ticketId,
}: {
  checklist: Checklist;
  projectId: number;
  ticketId: number;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(checklist.title);

  const updateChecklist = useUpdateChecklist(projectId, ticketId);
  const deleteChecklist = useDeleteChecklist(projectId, ticketId);
  const createItem = useCreateChecklistItem(projectId, ticketId);

  const completed = checklist.items.filter((i) => i.isCompleted).length;
  const total = checklist.items.length;
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
        {editingTitle ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 text-sm font-semibold bg-transparent border-b border-input outline-none"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-semibold text-foreground cursor-pointer hover:text-foreground/80"
            onClick={() => setEditingTitle(true)}
            onKeyDown={handleTitleSpanKeyDown}
            role="button"
            tabIndex={0}
          >
            {checklist.title}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground font-mono">
          {completed}/{total}
        </span>
        <button
          type="button"
          onClick={handleDeleteChecklist}
          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
          aria-label="Delete checklist"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden ml-6">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      <div className="ml-6 space-y-0.5">
        <AnimatePresence initial={false}>
          {checklist.items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              checklistId={checklist.id}
              projectId={projectId}
              ticketId={ticketId}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {addingItem ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
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
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 mt-1"
            >
              <Plus className="h-3 w-3" />
              Add item
            </button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function TicketChecklists({ projectId, ticketId }: TicketChecklistsProps) {
  const { data: checklists = [], isLoading } = useChecklists(
    projectId,
    ticketId,
  );
  const createChecklist = useCreateChecklist(projectId, ticketId);

  const handleAddChecklist = useCallback(() => {
    createChecklist.mutate("Checklist", {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [createChecklist]);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-full ml-6" />
        <div className="h-3 bg-muted rounded w-3/4 ml-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {checklists.map((checklist) => (
          <motion.div
            key={checklist.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ChecklistSection
              checklist={checklist}
              projectId={projectId}
              ticketId={ticketId}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleAddChecklist}
        disabled={createChecklist.isPending}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add checklist
      </button>
    </div>
  );
}
