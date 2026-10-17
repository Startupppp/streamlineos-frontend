"use client";

import { memo, useCallback } from "react";
import { Globe, Lock, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PM_ROW } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { WhiteboardSummary } from "@/hooks/api/build/whiteboards";

interface BoardItemProps {
  board: WhiteboardSummary;
  isSelected: boolean;
  canManage: boolean;
  onSelect: (id: number) => void;
  onDelete: (board: WhiteboardSummary) => void;
}

export const BoardItem = memo(function BoardItem({
  board,
  isSelected,
  canManage,
  onSelect,
  onDelete,
}: BoardItemProps) {
  const handleSelect = useCallback(
    () => onSelect(board.id),
    [onSelect, board.id],
  );
  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDelete(board);
    },
    [onDelete, board],
  );
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSelect();
  }

  const visibilityIcon =
    board.visibility === "private" ? (
      <Lock
        className="h-3 w-3 shrink-0 text-muted-foreground"
        aria-label="Private"
      />
    ) : board.visibility === "public" ? (
      <Globe
        className="h-3 w-3 shrink-0 text-muted-foreground"
        aria-label="Public"
      />
    ) : null;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          PM_ROW,
          "cursor-pointer border-0 last:border-b-0 text-sm",
          isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground",
        )}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1 font-medium">
            <TruncatedText text={board.name} />
            {visibilityIcon}
          </p>
          <p className={cn("text-dense text-muted-foreground", TEXT_ONE_LINE)}>
            {board.elementCount} {board.elementCount === 1 ? "item" : "items"}
          </p>
        </div>
        {canManage && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            aria-label="Delete board"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </li>
  );
});

export const MobileBoardChip = memo(function MobileBoardChip({
  board,
  isSelected,
  onSelect,
}: {
  board: WhiteboardSummary;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) {
  const handleClick = useCallback(
    () => onSelect(board.id),
    [onSelect, board.id],
  );
  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
        isSelected
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {board.name}
    </button>
  );
});
