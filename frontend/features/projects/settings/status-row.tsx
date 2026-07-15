"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  useUpdateCustomState,
  useDeleteCustomState,
  type CustomState,
} from "@/hooks/api/projects/custom-states";
import { ColumnColorPicker } from "@/features/projects/shared/column-color-picker";
import { resolveColumnColor } from "@/features/projects/shared/column-colors";
import { cn } from "@/lib/utils";

export type StateType = "unstarted" | "started" | "completed" | "cancelled";

export const STATE_TYPE_KEYS: readonly StateType[] = [
  "unstarted",
  "started",
  "completed",
  "cancelled",
];

export const TYPE_CONFIG: Record<StateType, { label: string; color: string }> = {
  unstarted: {
    label: "Unstarted",
    color: "bg-muted text-muted-foreground",
  },
  started: {
    label: "Started",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  },
};

const MAX_NAME = 50;

function isStateType(value: string | null | undefined): value is StateType {
  return STATE_TYPE_KEYS.some((t) => t === value);
}

export function resolveStateType(type: string | null | undefined): StateType {
  return isStateType(type) ? type : "unstarted";
}

function validateName(
  name: string,
  currentName: string,
  existingNames: string[],
): string | null {
  if (!name) return "Name is required";
  if (!/[a-zA-Z0-9]/.test(name)) {
    return "Name must contain at least one letter or number";
  }
  if (name.length > MAX_NAME) {
    return `Name must be ${MAX_NAME} characters or fewer`;
  }
  if (name.toLowerCase() === currentName.toLowerCase()) return null;
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return "A status with this name already exists";
  }
  return null;
}

interface StatusRowProps {
  state: CustomState;
  index: number;
  canManage: boolean;
  existingNames: string[];
  projectId: number;
}

export const StatusRow = memo(function StatusRow({
  state,
  index,
  canManage,
  existingNames,
  projectId,
}: StatusRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(state.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateState = useUpdateCustomState(projectId);
  const deleteState = useDeleteCustomState(projectId);

  const stateType = resolveStateType(state.type);
  const typeConfig = TYPE_CONFIG[stateType];
  const color = resolveColumnColor(state.color);

  const handleStartRename = useCallback(() => {
    if (!canManage) return;
    setRenameValue(state.name);
    setRenameError(null);
    setIsRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [canManage, state.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === state.name) {
      setIsRenaming(false);
      setRenameValue(state.name);
      setRenameError(null);
      return;
    }
    const error = validateName(trimmed, state.name, existingNames);
    if (error) {
      setRenameError(error);
      return;
    }
    updateState.mutate(
      { stateId: state.id, name: trimmed },
      {
        onSuccess: () => {
          setIsRenaming(false);
          toast.success("Status renamed");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          setRenameValue(state.name);
          setIsRenaming(false);
        },
      },
    );
  }, [renameValue, state, existingNames, updateState]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleRenameSubmit();
      if (e.key === "Escape") {
        setIsRenaming(false);
        setRenameValue(state.name);
        setRenameError(null);
      }
    },
    [handleRenameSubmit, state.name],
  );

  const handleRenameBlur = useCallback(() => {
    if (renameError) {
      setIsRenaming(false);
      setRenameValue(state.name);
      setRenameError(null);
      return;
    }
    handleRenameSubmit();
  }, [handleRenameSubmit, renameError, state.name]);

  const handleRenameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRenameValue(e.target.value);
      setRenameError(null);
    },
    [],
  );

  const handleColorChange = useCallback(
    (nextColor: string) => {
      if (nextColor.toLowerCase() === color.toLowerCase()) {
        setColorOpen(false);
        return;
      }
      setColorOpen(false);
      updateState.mutate(
        { stateId: state.id, color: nextColor },
        {
          onSuccess: () => toast.success("Status color updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [color, state.id, updateState],
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      if (!isStateType(value) || value === stateType) return;
      updateState.mutate(
        { stateId: state.id, type: value },
        {
          onSuccess: () => toast.success("Category updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [state.id, stateType, updateState],
  );

  const handleDelete = useCallback(() => {
    deleteState.mutate(state.id, {
      onSuccess: () => toast.success("Status deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteState, state.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors group"
    >
      {canManage ? (
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-3 w-3 rounded-full shrink-0 ring-offset-1 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: color }}
              aria-label="Change status color"
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2.5" align="start">
            <ColumnColorPicker
              value={color}
              onChange={handleColorChange}
              showLabel={false}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}

      {isRenaming ? (
        <div className="flex-1 min-w-0">
          <Input
            ref={inputRef}
            value={renameValue}
            onChange={handleRenameChange}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            className={cn(
              "h-8 text-sm px-1.5",
              renameError && "border-destructive focus-visible:ring-destructive",
            )}
            disabled={updateState.isPending}
            maxLength={MAX_NAME}
            aria-invalid={!!renameError}
            aria-label="Status name"
          />
          {renameError ? (
            <p className="text-[10px] text-destructive mt-0.5 truncate">
              {renameError}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartRename}
          disabled={!canManage}
          className={cn(
            "flex-1 min-w-0 text-left text-sm font-medium truncate",
            canManage && "cursor-text hover:text-foreground/80",
          )}
        >
          {state.name}
        </button>
      )}

      {canManage ? (
        <Select
          value={stateType}
          onValueChange={handleTypeChange}
          disabled={updateState.isPending}
        >
          <SelectTrigger className="w-[118px] shrink-0 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATE_TYPE_KEYS.map((key) => (
              <SelectItem key={key} value={key} className="text-sm">
                {TYPE_CONFIG[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge
          variant="secondary"
          className={cn("text-[10px] shrink-0", typeConfig.color)}
        >
          {typeConfig.label}
        </Badge>
      )}

      {canManage ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "h-6 w-6 flex items-center justify-center rounded",
                "text-muted-foreground hover:text-red-600 hover:bg-red-50",
                "dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-all",
              )}
              aria-label={`Delete status ${state.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete status?</AlertDialogTitle>
              <AlertDialogDescription>
                Tickets using &ldquo;{state.name}&rdquo; will move to another
                Unstarted status. At least one Unstarted and one Completed
                status must remain.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </motion.div>
  );
});
