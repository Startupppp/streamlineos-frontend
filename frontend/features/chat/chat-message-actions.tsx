"use client";

import { useState } from "react";
import { CalendarClock, Forward, Link, ListPlus, Pencil, Pin, Quote, SmilePlus } from "lucide-react";
import {
  BookmarkCheckIcon,
  BookmarkPlusIcon,
  CopyIcon,
  EllipsisIcon,
  ReplyIcon,
  Trash2Icon,
  UserPlusIcon,
} from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const ACTION_BUTTON_CLASS = "size-8 rounded-md p-0 text-muted-foreground hover:text-foreground";

const ROVING_KEYS: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

function handleToolbarKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const move = ROVING_KEYS[event.key];
  if (!move) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(":scope > button"));
  const index = buttons.findIndex((button) => button === document.activeElement);
  if (index < 0) return;
  event.preventDefault();
  buttons[move(index, buttons.length)]?.focus();
}

export function MessageActions({
  isOwn,
  isPinned,
  isSaved,
  hasContent,
  canEdit,
  canDelete,
  canWrite,
  canPin,
  onOpenThread,
  onQuoteReply,
  onSave,
  onUnsave,
  onPin,
  onUnpin,
  onReact,
  onCopy,
  onCopyLink,
  onForward,
  canConvertToTask,
  onConvertToTask,
  canAssignTicket,
  onAssignTicket,
  canSetDueDate,
  onSetDueDate,
  onStartEdit,
  onDelete,
  deleteTitle,
}: {
  isOwn: boolean;
  isPinned?: boolean;
  isSaved?: boolean;
  hasContent: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canWrite: boolean;
  canPin: boolean;
  onOpenThread: () => void;
  onQuoteReply: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onForward?: () => void;
  canConvertToTask: boolean;
  onConvertToTask: () => void;
  canAssignTicket: boolean;
  onAssignTicket: () => void;
  canSetDueDate: boolean;
  onSetDueDate: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  deleteTitle: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmUnpinOpen, setConfirmUnpinOpen] = useState(false);
  const keepVisible = menuOpen || reactionsOpen || confirmDeleteOpen || confirmUnpinOpen;
  const hasEntityActions = canConvertToTask || canAssignTicket || canSetDueDate;
  const saveHandler = isSaved ? onUnsave : onSave;

  function quickReactHandler(emoji: string): () => void {
    return function handleQuickReact(): void {
      onReact(emoji);
      setReactionsOpen(false);
    };
  }

  function handleRequestDelete() {
    setConfirmDeleteOpen(true);
  }

  function handleRequestUnpin() {
    setConfirmUnpinOpen(true);
  }

  return (
    <div
      className={cn(
        "absolute bottom-full mb-1 z-50 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:static [@media(hover:none)]:mt-1 [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto",
        isOwn ? "right-0" : "left-0",
        keepVisible && "opacity-100 pointer-events-auto",
      )}
    >
      <div
        role="toolbar"
        aria-label="Message actions"
        onKeyDown={handleToolbarKeyDown}
        className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background p-0.5 shadow-md"
      >
        <AnimatedIconButton
          type="button"
          icon={ReplyIcon}
          iconSize={14}
          variant="ghost"
          className={ACTION_BUTTON_CLASS}
          onClick={onOpenThread}
          aria-label="Reply in thread"
        />
        <Popover open={reactionsOpen} onOpenChange={setReactionsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={cn(ACTION_BUTTON_CLASS, reactionsOpen && "bg-muted text-foreground")}
              tabIndex={-1}
              aria-label="Add reaction"
            >
              <SmilePlus className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align={isOwn ? "end" : "start"} className="flex w-auto gap-1 p-1.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={quickReactHandler(emoji)}
                className="flex size-9 items-center justify-center rounded-lg text-base transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              type="button"
              icon={EllipsisIcon}
              iconSize={14}
              variant="ghost"
              className={cn(ACTION_BUTTON_CLASS, menuOpen && "bg-muted text-foreground")}
              tabIndex={-1}
              aria-label="More message actions"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-52">
            {saveHandler ? (
              <DropdownMenuItem onSelect={saveHandler}>
                {isSaved ? <BookmarkCheckIcon size={16} /> : <BookmarkPlusIcon size={16} />}
                {isSaved ? "Remove from saved" : "Save message"}
              </DropdownMenuItem>
            ) : null}
            {canPin ? (
              <DropdownMenuItem onSelect={isPinned ? handleRequestUnpin : onPin}>
                <Pin />
                {isPinned ? "Unpin message" : "Pin message"}
              </DropdownMenuItem>
            ) : null}
            {hasContent ? (
              <DropdownMenuItem onSelect={onCopy}>
                <CopyIcon size={16} />
                Copy text
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onCopyLink}>
              <Link />
              Copy link
            </DropdownMenuItem>
            {canWrite && onForward ? (
              <DropdownMenuItem onSelect={onForward}>
                <Forward />
                Forward
              </DropdownMenuItem>
            ) : null}
            {canWrite ? (
              <DropdownMenuItem onSelect={onQuoteReply}>
                <Quote />
                Quote reply
              </DropdownMenuItem>
            ) : null}
            {hasEntityActions ? <DropdownMenuSeparator /> : null}
            {canConvertToTask ? (
              <DropdownMenuItem onSelect={onConvertToTask}>
                <ListPlus />
                Convert to task
              </DropdownMenuItem>
            ) : null}
            {canAssignTicket ? (
              <DropdownMenuItem onSelect={onAssignTicket}>
                <UserPlusIcon size={16} />
                Assign ticket
              </DropdownMenuItem>
            ) : null}
            {canSetDueDate ? (
              <DropdownMenuItem onSelect={onSetDueDate}>
                <CalendarClock />
                Set due date
              </DropdownMenuItem>
            ) : null}
            {canEdit || canDelete ? <DropdownMenuSeparator /> : null}
            {canEdit ? (
              <DropdownMenuItem onSelect={onStartEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
            ) : null}
            {canDelete ? (
              <DropdownMenuItem variant="destructive" onSelect={handleRequestDelete}>
                <Trash2Icon size={16} />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {canPin && isPinned ? (
        <ConfirmDialog
          open={confirmUnpinOpen}
          onOpenChange={setConfirmUnpinOpen}
          title="Unpin this message?"
          description="It is removed from the pinned list for everyone in the conversation."
          confirmLabel="Unpin"
          destructive
          onConfirm={onUnpin}
        />
      ) : null}
      {canDelete ? (
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title={deleteTitle}
          description="It is removed for everyone in the conversation. This cannot be undone."
          confirmLabel="Delete message"
          destructive
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
