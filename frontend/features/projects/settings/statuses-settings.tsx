"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  useCustomStates,
  useCreateCustomState,
  useDeleteCustomState,
} from "@/hooks/api/projects/custom-states";
import { cn } from "@/lib/utils";

type StateType = "unstarted" | "started" | "completed" | "cancelled";

const TYPE_CONFIG: Record<StateType, { label: string; color: string }> = {
  unstarted: { label: "Unstarted", color: "bg-slate-100 text-slate-600" },
  started: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#eab308",
  "#ef4444",
  "#94a3b8",
];

export function StatusesSettings({ projectId }: { projectId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<StateType>("unstarted");
  const [color, setColor] = useState("#6366f1");

  const { data: states = [], isLoading } = useCustomStates(projectId);
  const createState = useCreateCustomState(projectId);
  const deleteState = useDeleteCustomState(projectId);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createState.mutate(
      { name: name.trim(), color, type },
      {
        onSuccess: () => {
          setName("");
          setType("unstarted");
          setColor("#6366f1");
          setShowForm(false);
          toast.success("Status created");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, color, type, createState]);

  const handleDelete = useCallback(
    (stateId: number) => {
      deleteState.mutate(stateId, {
        onSuccess: () => toast.success("Status deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteState],
  );

  const handleTypeChange = useCallback((v: string) => setType(v as StateType), []);

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
        {states.map((state, idx) => {
          const tc = TYPE_CONFIG[state.type] ?? TYPE_CONFIG.unstarted;
          return (
            <motion.div
              key={state.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors group"
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ background: state.color }}
              />
              <span className="flex-1 text-sm font-medium truncate">
                {state.name}
              </span>
              <Badge
                variant="secondary"
                className={cn("text-[10px] shrink-0", tc.color)}
              >
                {tc.label}
              </Badge>
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
                    <AlertDialogTitle>Delete status?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tickets with this status will revert to the default state.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(state.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl border border-violet-200 bg-violet-50/30 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. In Review"
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select value={type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_CONFIG) as [StateType, { label: string; color: string }][]).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">
                Color:
              </span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-slate-700" : "border-transparent",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!name.trim() || createState.isPending}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-7 text-xs"
              >
                {createState.isPending ? "Creating..." : "Create"}
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
          Add Status
        </Button>
      )}
    </div>
  );
}
