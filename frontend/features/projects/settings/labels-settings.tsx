"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
];

export function LabelsSettings() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");

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
          setColor("#6366f1");
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
            className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white/60 hover:bg-white transition-colors group"
          >
            {editingId === label.id ? (
              <>
                <div
                  className="h-5 w-5 rounded-full shrink-0 border-2 border-white shadow-sm"
                  style={{ background: editColor }}
                />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm flex-1 max-w-[200px]"
                  autoFocus
                />
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={cn(
                        "h-4 w-4 rounded-full border-2 transition-transform hover:scale-110",
                        editColor === c
                          ? "border-slate-700 scale-110"
                          : "border-transparent",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-violet-600"
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
                  className="h-5 w-5 rounded-full shrink-0 border-2 border-white shadow-sm"
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
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
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
            className="p-3 rounded-xl border border-violet-200 bg-violet-50/30 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-6 w-6 rounded-full shrink-0 border-2 border-white shadow-sm"
                style={{ background: color }}
              />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Label name"
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">
                Color:
              </Label>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                    color === c
                      ? "border-slate-700 scale-110"
                      : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!name.trim() || createLabel.isPending}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-7 text-xs"
              >
                {createLabel.isPending ? "Creating..." : "Create"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelForm}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
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
