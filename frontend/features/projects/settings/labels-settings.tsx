"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabelColorPicker, LabelCreateForm } from "@/components/labels";
import { DEFAULT_LABEL_COLOR } from "@/components/labels/label-colors";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useOrgLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  type TicketLabel,
} from "@/hooks/api/projects/labels";

export function LabelsSettings() {
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
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setName("");
          setColor(DEFAULT_LABEL_COLOR);
          setShowForm(false);
          toast.success("Label created");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, color, createLabel]);

  const handleUpdate = useCallback(
    (label: TicketLabel) => {
      updateLabel.mutate(
        { id: label.id, name: editName.trim() || label.name, color: editColor },
        {
          onSuccess: () => {
            setEditingId(null);
            toast.success("Label updated");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [editName, editColor, updateLabel],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteLabel.mutate(id, {
        onSuccess: () => toast.success("Label deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteLabel],
  );

  const handleStartEdit = useCallback((label: TicketLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  }, []);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setName("");
  }, []);

  const handleShowForm = useCallback(() => setShowForm(true), []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {labels.map((label, idx) => (
          <motion.div
            key={label.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors group"
          >
            {editingId === label.id ? (
              <>
                <div
                  className="h-5 w-5 rounded-full shrink-0 border-2 border-card shadow-sm"
                  style={{ background: editColor }}
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm flex-1 max-w-[200px]"
                  autoFocus
                />
                <LabelColorPicker
                  value={editColor}
                  onChange={setEditColor}
                  showLabel={false}
                  swatchSize="md"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-primary"
                  onClick={() => handleUpdate(label)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div
                  className="h-5 w-5 rounded-full shrink-0 border-2 border-card shadow-sm"
                  style={{ background: label.color }}
                />
                <span
                  className="text-sm font-medium flex-1 truncate cursor-pointer"
                  onClick={() => handleStartEdit(label)}
                >
                  {label.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100">
                  {label.color}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete label?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the label from all tickets.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(label.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-muted/30 p-3"
          >
            <LabelCreateForm
              name={name}
              color={color}
              onNameChange={setName}
              onColorChange={setColor}
              onSubmit={handleCreate}
              isPending={createLabel.isPending}
              submitLabel="Create"
              loadingText="Creating…"
              showPreview={false}
              fullWidthSubmit={false}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelForm}
              className="mt-2 h-7 text-xs"
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowForm}
          className="h-7 text-xs gap-1.5 mt-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Label
        </Button>
      )}
    </div>
  );
}
