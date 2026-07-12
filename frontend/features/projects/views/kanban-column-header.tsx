"use client";

import { useState, useRef, useCallback } from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useUpdateCustomState,
  useDeleteCustomState,
} from "@/hooks/api/projects/custom-states";
import type { KanbanColumn } from "../shared/types";
import { ColumnColorPicker } from "../shared/column-color-picker";
import { resolveColumnColor } from "../shared/column-colors";

interface KanbanColumnHeaderProps {
  column: KanbanColumn;
  projectId: number;
  ticketCount: number;
  wipLimit?: number;
  canManage: boolean;
  onRename?: (oldName: string, newName: string) => void;
  onColorChange?: (statusId: number, color: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  quickAdd?: React.ReactNode;
}

export function KanbanColumnHeader({
  column,
  projectId,
  ticketCount,
  wipLimit,
  canManage,
  onRename,
  onColorChange,
  onMoveLeft,
  onMoveRight,
  canMoveLeft = false,
  canMoveRight = false,
  quickAdd,
}: KanbanColumnHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(column.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const updateState = useUpdateCustomState(projectId);
  const deleteState = useDeleteCustomState(projectId);

  const isEditable = canManage && column.statusId != null;

  const handleStartRename = useCallback(() => {
    setRenameValue(column.name);
    setIsRenaming(true);
    setMenuOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [column.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === column.name || column.statusId == null) {
      setIsRenaming(false);
      setRenameValue(column.name);
      return;
    }
    const oldName = column.id;
    updateState.mutate(
      { stateId: column.statusId, name: trimmed },
      {
        onSuccess: () => {
          onRename?.(oldName, trimmed);
          setIsRenaming(false);
          toast.success("Column renamed");
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          setRenameValue(column.name);
          setIsRenaming(false);
        },
      },
    );
  }, [renameValue, column, updateState, onRename]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleRenameSubmit();
      if (e.key === "Escape") {
        setIsRenaming(false);
        setRenameValue(column.name);
      }
    },
    [handleRenameSubmit, column.name],
  );

  const handleRenameBlur = useCallback(() => {
    handleRenameSubmit();
  }, [handleRenameSubmit]);

  const handleRenameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRenameValue(e.target.value);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (column.statusId == null) return;
    deleteState.mutate(column.statusId, {
      onSuccess: () => {
        setDeleteOpen(false);
        toast.success("Column deleted");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [column.statusId, deleteState]);

  const handleDeleteSelect = useCallback(() => {
    setMenuOpen(false);
    setDeleteOpen(true);
  }, []);

  const handleMoveLeft = useCallback(() => {
    setMenuOpen(false);
    onMoveLeft?.();
  }, [onMoveLeft]);

  const handleMoveRight = useCallback(() => {
    setMenuOpen(false);
    onMoveRight?.();
  }, [onMoveRight]);

  const handleMenuMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleTitleClick = useCallback(() => {
    if (isEditable) handleStartRename();
  }, [isEditable, handleStartRename]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      const statusId = column.statusId;
      if (statusId == null) return;
      const currentColor = resolveColumnColor(column.color);
      if (newColor.toLowerCase() === currentColor.toLowerCase()) {
        setColorPickerOpen(false);
        return;
      }
      const previousColor = column.color;
      onColorChange?.(statusId, newColor);
      setColorPickerOpen(false);
      updateState.mutate(
        { stateId: statusId, color: newColor },
        {
          onSuccess: () => toast.success("Column color updated"),
          onError: (error) => {
            if (previousColor != null) {
              onColorChange?.(statusId, previousColor);
            }
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [column.statusId, column.color, onColorChange, updateState],
  );

  const columnColor = resolveColumnColor(column.color);

  return (
    <div className="relative flex items-center justify-between px-3 py-2 gap-1">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {isEditable ? (
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="h-2.5 w-2.5 rounded-full shrink-0 ring-offset-1 hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: columnColor }}
                aria-label="Change column color"
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2.5" align="start">
              <ColumnColorPicker
                value={columnColor}
                onChange={handleColorChange}
                showLabel={false}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: columnColor }}
          />
        )}
        {isRenaming ? (
          <Input
            ref={inputRef}
            value={renameValue}
            onChange={handleRenameChange}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameBlur}
            className="h-6 text-[13px] px-1.5 flex-1 min-w-0"
            disabled={updateState.isPending}
          />
        ) : (
          <h3
            className={cn(
              "font-medium text-[13px] text-foreground truncate",
              isEditable && "cursor-text hover:text-foreground/80",
            )}
            onClick={handleTitleClick}
            title={isEditable ? "Click to rename" : column.name}
          >
            {column.name}
          </h3>
        )}
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {ticketCount}
          {wipLimit != null && `/${wipLimit}`}
        </span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {quickAdd}
        {isEditable ? (
          <div onMouseDown={handleMenuMouseDown}>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  {...hoverHandlers}
                >
                  <EllipsisIcon ref={iconRef} size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={handleStartRename}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDeleteSelect}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column?</AlertDialogTitle>
            <AlertDialogDescription>
              Tickets in &ldquo;{column.name}&rdquo; will keep their current status until moved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
