"use client";

import type { RefObject } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_COLUMN_NAME } from "./kanban-column-header-model";

interface KanbanColumnRenameInputProps {
  isRenaming: boolean;
  renameValue: string;
  renameError: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  columnName: string;
  isEditable: boolean;
  onStartRename: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export function KanbanColumnRenameInput({
  isRenaming,
  renameValue,
  renameError,
  inputRef,
  isPending,
  columnName,
  isEditable,
  onStartRename,
  onChange,
  onKeyDown,
  onBlur,
}: KanbanColumnRenameInputProps) {
  if (isRenaming) {
    return (
      <div className="flex flex-col flex-1 min-w-0">
        <Input
          ref={inputRef}
          value={renameValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className={cn("h-6 text-label px-1.5 min-w-0", renameError && "border-destructive focus-visible:ring-destructive")}
          disabled={isPending}
          maxLength={MAX_COLUMN_NAME}
          aria-invalid={!!renameError}
          title={renameError ?? undefined}
        />
        {renameError && (
          <p className="text-micro text-destructive leading-tight mt-0.5 truncate">{renameError}</p>
        )}
      </div>
    );
  }

  return (
    <h3 className="min-w-0 truncate text-dense font-medium uppercase tracking-wider text-foreground">
      {isEditable ? (
        <button
          type="button"
          className="max-w-full cursor-text truncate transition-colors hover:text-muted-foreground"
          onClick={onStartRename}
          title="Click to rename"
        >
          {columnName}
        </button>
      ) : (
        <span className="truncate" title={columnName}>
          {columnName}
        </span>
      )}
    </h3>
  );
}
