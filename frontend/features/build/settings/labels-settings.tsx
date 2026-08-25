"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { LabelCreateForm } from "@/components/labels";
import { DEFAULT_LABEL_COLOR, resolveLabelColor } from "@/components/labels/label-colors";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useOrgLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  type TicketLabel,
} from "@/hooks/api/build/labels";
import { LabelEditRow } from "./label-edit-row";
import { TEXT_BODY, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

function DeleteLabelButton({ onConfirm }: { onConfirm: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleConfirm() {
    onConfirm();
  }

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className={cn(
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            "h-7 w-7 flex items-center justify-center rounded-md",
            "text-muted-foreground hover:text-red-600 hover:bg-red-50",
            "dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all",
          )}
          aria-label="Delete label"
          {...hoverHandlers}
        >
          <Trash2Icon ref={iconRef} size={14} />
        </button>
      }
      title="Delete label?"
      description="This removes the label from all tickets."
      confirmLabel="Delete"
      destructive
      onConfirm={handleConfirm}
    />
  );
}

function AddLabelButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="shrink-0 gap-1.5 text-xs"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={14} />
      Add Label
    </Button>
  );
}

function LabelsHeader({
  showAdd,
  onAdd,
}: {
  showAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0">
        <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>Labels</h3>
        <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
          Manage labels for organizing tickets across this organization.
        </p>
      </div>
      {showAdd ? <AddLabelButton onClick={onAdd} /> : null}
    </div>
  );
}

function LabelListRow({
  label,
  index,
  onEdit,
  onDelete,
}: {
  label: TicketLabel;
  index: number;
  onEdit: (label: TicketLabel) => void;
  onDelete: (id: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const color = resolveLabelColor(label.color);

  function handleEdit() {
    onEdit(label);
  }

  function handleDelete() {
    onDelete(label.id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit(label);
    }
  }

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      transition={{ delay: reduceMotion ? 0 : index * 0.03, duration: 0.18 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:bg-muted/40 transition-colors group"
    >
      <button
        type="button"
        onClick={handleEdit}
        onKeyDown={handleKeyDown}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Edit label ${label.name}`}
      >
        <span
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
            "bg-primary/5 border-primary/15",
          )}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full shadow-sm ring-1 ring-background"
            style={{ backgroundColor: color }}
          />
          <span className="truncate">{label.name}</span>
        </span>
        <span className="font-mono text-micro uppercase text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {color}
        </span>
      </button>
      <DeleteLabelButton onConfirm={handleDelete} />
    </motion.div>
  );
}

export function LabelsSettings() {
  const reduceMotion = useReducedMotion();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_LABEL_COLOR);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_LABEL_COLOR);

  const { data: labels = [], isLoading } = useOrgLabels();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createLabel.mutate(
      { name: name.trim(), color: resolveLabelColor(color) },
      {
        onSuccess: () => {
          setName("");
          setColor(DEFAULT_LABEL_COLOR);
          setShowForm(false);
          toast.success("Label created");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [name, color, createLabel]);

  const handleUpdate = useCallback(
    (label: TicketLabel) => {
      const nextName = editName.trim() || label.name;
      updateLabel.mutate(
        { id: label.id, name: nextName, color: resolveLabelColor(editColor) },
        {
          onSuccess: () => {
            setEditingId(null);
            toast.success("Label updated");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [editName, editColor, updateLabel],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteLabel.mutate(id, {
        onSuccess: () => toast.success("Label deleted"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [deleteLabel],
  );

  const handleStartEdit = useCallback((label: TicketLabel) => {
    setShowForm(false);
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(resolveLabelColor(label.color));
  }, []);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setName("");
    setColor(DEFAULT_LABEL_COLOR);
  }, []);

  const handleShowForm = useCallback(() => {
    setEditingId(null);
    setShowForm(true);
  }, []);

  if (isLoading) {
    return (
      <div>
        <LabelsHeader showAdd={false} onAdd={handleShowForm} />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <LabelsHeader showAdd={!showForm} onAdd={handleShowForm} />
      <div className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {labels.map((label, index) => {
            if (editingId === label.id) {
              function handleSaveEdit() {
                handleUpdate(label);
              }

              return (
                <LabelEditRow
                  key={label.id}
                  name={editName}
                  color={editColor}
                  isPending={updateLabel.isPending}
                  onNameChange={setEditName}
                  onColorChange={setEditColor}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              );
            }

            return (
              <LabelListRow
                key={label.id}
                label={label}
                index={index}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {showForm ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <LabelCreateForm
                  name={name}
                  color={color}
                  onNameChange={setName}
                  onColorChange={setColor}
                  onSubmit={handleCreate}
                  onCancel={handleCancelForm}
                  isPending={createLabel.isPending}
                  submitLabel="Create"
                  loadingText="Creating…"
                  showPreview
                  fullWidthSubmit={false}
                  autoFocus
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
