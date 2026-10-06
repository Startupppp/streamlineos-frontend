"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateCustomState,
  useDeleteCustomState,
  type CustomState,
} from "@/hooks/api/build/custom-states";
import { ColumnColorPicker } from "@/features/build/shared/column-color-picker";
import { resolveColumnColor } from "@/lib/column-colors";
import { cn } from "@/lib/utils";
import {
  isStateType,
  resolveStateType,
  validateStatusName,
  STATE_TYPE_KEYS,
  TYPE_CONFIG,
  MAX_STATUS_NAME,
} from "./status-row-constants";

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
  const { iconRef: deleteIconRef, hoverHandlers: deleteHoverHandlers } = useAnimatedIcon();

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
    const error = validateStatusName(trimmed, state.name, existingNames);
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
            maxLength={MAX_STATUS_NAME}
            aria-invalid={!!renameError}
            aria-label="Status name"
          />
          {renameError ? (
            <p className="text-micro text-destructive mt-0.5 truncate">
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
          <SelectTrigger className="w-[118px] shrink-0">
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
          className={cn("text-micro shrink-0", typeConfig.color)}
        >
          {typeConfig.label}
        </Badge>
      )}

      {canManage ? (
        <ConfirmDialog
          trigger={
            <button
              type="button"
              className={cn(
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "h-6 w-6 flex items-center justify-center rounded",
                "text-muted-foreground hover:text-status-danger-ink hover:bg-status-danger-surface",
                "transition-all",
              )}
              aria-label={`Delete status ${state.name}`}
              {...deleteHoverHandlers}
            >
              <Trash2Icon ref={deleteIconRef} size={14} />
            </button>
          }
          title="Delete status?"
          description={`Tickets using "${state.name}" will move to another Unstarted status. At least one Unstarted and one Completed status must remain.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
        />
      ) : null}
    </motion.div>
  );
});
