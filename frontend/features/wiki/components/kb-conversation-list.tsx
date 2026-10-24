"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  KbMoreHorizontalIcon,
  KbPenLineIcon,
  KbTrash2Icon,
  KbXIcon,
} from "@/features/wiki/lib/kb-icons";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import type { KbConversation } from "@/hooks/api/kb/chat-history";

function conversationDateGroup(updatedAt: string): string {
  const d = new Date(updatedAt);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Past week";
  if (diff <= 30) return "Past month";
  return "Older";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ConversationRowActionsProps {
  conv: KbConversation;
  onRename: (id: number, title: string) => void;
  onDeleteRequest: (id: number) => void;
}

function ConversationRowActions({ conv, onRename, onDeleteRequest }: ConversationRowActionsProps) {
  function handleRenameSelect() {
    onRename(conv.id, conv.title ?? "");
  }

  function handleDeleteSelect() {
    onDeleteRequest(conv.id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="More options"
          className="size-9 shrink-0 text-muted-foreground lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 lg:focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <KbMoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={handleRenameSelect}>
          <KbPenLineIcon className="mr-2 size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDeleteSelect}>
          <KbTrash2Icon className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface KbConversationListProps {
  conversations: KbConversation[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  activeConversationId: number | null;
}

export function KbConversationList({
  conversations, hasNextPage, isFetchingNextPage, onLoadMore,
  onSelect, onNewChat, onRename, onDelete, onClose,
  search, onSearchChange, activeConversationId,
}: KbConversationListProps) {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const cancelRenameRef = useRef(false);

  useEffect(() => {
    function handleEscapeKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c) => (c.title ?? "New conversation").toLowerCase().includes(q))
      : conversations;
    const map = new Map<string, KbConversation[]>();
    for (const c of filtered) {
      const g = conversationDateGroup(c.updatedAt);
      const arr = map.get(g) ?? [];
      arr.push(c);
      map.set(g, arr);
    }
    const groups: { label: string; items: KbConversation[] }[] = [];
    for (const g of ["Today", "Yesterday", "Past week", "Past month", "Older"] as const) {
      const items = map.get(g);
      if (items) groups.push({ label: g, items });
    }
    return groups;
  }, [conversations, search]);

  function handleRenameInputChange(e: React.ChangeEvent<HTMLInputElement>) { setRenameValue(e.target.value); }

  function handleRenameCommit() {
    if (!cancelRenameRef.current && renamingId !== null && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    cancelRenameRef.current = false;
    setRenamingId(null);
    setRenameValue("");
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { cancelRenameRef.current = false; handleRenameCommit(); }
    if (e.key === "Escape") { cancelRenameRef.current = true; setRenamingId(null); setRenameValue(""); }
  }

  function handleSelectItem(e: React.MouseEvent<HTMLButtonElement>) {
    const id = Number(e.currentTarget.dataset.conversationId);
    if (id) onSelect(id);
  }

  function handleRowRename(id: number, title: string) {
    setRenamingId(id);
    setRenameValue(title);
  }

  function handleRowDeleteRequest(id: number) {
    setDeleteTargetId(id);
  }

  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleteTargetId(null); }

  function handleDeleteConfirm() {
    if (deleteTargetId !== null) { onDelete(deleteTargetId); setDeleteTargetId(null); }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">Conversations</h2>
        <div className="flex min-w-0 items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={onSearchChange}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="min-w-0"
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onNewChat} className="gap-1.5">
              <KbPenLineIcon className="size-4" />
              New chat
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
              <KbXIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="overscroll-contain px-4 py-3 sm:px-6">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          <>
            {groups.map(({ label, items }) => (
              <section key={label} className="mb-2">
                <h3 className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
                <ul>
                {items.map((conv) => (
                  <li
                    key={conv.id}
                    className={cn(
                      "group flex min-h-9 items-center gap-2 rounded-md px-2",
                      activeConversationId === conv.id ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    {renamingId === conv.id ? (
                      <Input
                        aria-label="Rename conversation"
                        value={renameValue}
                        onChange={handleRenameInputChange}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleRenameCommit}
                        autoFocus
                        className="my-1 h-9 min-w-0 flex-1"
                      />
                    ) : (
                      <button
                        type="button"
                        data-conversation-id={conv.id}
                        onClick={handleSelectItem}
                        className="flex h-9 min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <TruncatedText text={conv.title ?? "New conversation"} className="min-w-0 flex-1 text-sm font-medium text-foreground" />
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{relativeTime(conv.updatedAt)}</span>
                      </button>
                    )}
                    <ConversationRowActions
                      conv={conv}
                      onRename={handleRowRename}
                      onDeleteRequest={handleRowDeleteRequest}
                    />
                  </li>
                ))}
                </ul>
              </section>
            ))}
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={onLoadMore}
              label="Load more conversations"
              rootMargin="0px"
            />
          </>
        )}
        </div>
      </ScrollArea>

      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete conversation?"
        description="This will permanently delete this conversation and all its messages."
        destructive
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
