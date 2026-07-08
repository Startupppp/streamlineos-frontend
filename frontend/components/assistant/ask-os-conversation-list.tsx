"use client";

import { useState } from "react";
import { MessageCircle, MoreHorizontal, PenLine, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { AiConversation } from "@/hooks/api/chat-ai-assistant";

export interface AskOsConversationListProps {
  conversations: AiConversation[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  activeConversationId: number | null;
}

const DATE_GROUPS = ["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"] as const;
type DateGroup = (typeof DATE_GROUPS)[number];

function conversationDateGroup(updatedAt: string): DateGroup {
  const d = new Date(updatedAt);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 Days";
  if (diff <= 30) return "Previous 30 Days";
  return "Older";
}

function relativeTime(updatedAt: string): string {
  const m = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AskOsConversationList({
  conversations, hasNextPage, isFetchingNextPage, onLoadMore,
  onSelect, onNewChat, onRename, onDelete,
  search, onSearchChange, activeConversationId,
}: AskOsConversationListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = search.trim()
    ? conversations.filter((c) => (c.title ?? "").toLowerCase().includes(search.trim().toLowerCase()))
    : conversations;

  const grouped: Record<DateGroup, AiConversation[]> = { Today: [], Yesterday: [], "Previous 7 Days": [], "Previous 30 Days": [], Older: [] };
  for (const c of filtered) grouped[conversationDateGroup(c.updatedAt)].push(c);

  function commitRename(id: number) {
    const t = editValue.trim();
    if (t) onRename(id, t);
    setEditingId(null);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) { onSearchChange(e.target.value); }
  function handleSelectBtn(e: React.MouseEvent<HTMLButtonElement>) { onSelect(Number(e.currentTarget.dataset.id)); }

  function handleMenuRename(e: React.MouseEvent<HTMLElement>) {
    const id = Number(e.currentTarget.dataset.id);
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    setEditingId(id);
    setEditValue(conv.title ?? "");
  }

  function handleMenuDelete(e: React.MouseEvent<HTMLElement>) { setDeleteId(Number(e.currentTarget.dataset.id)); }
  function handleRenameChange(e: React.ChangeEvent<HTMLInputElement>) { setEditValue(e.target.value); }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const id = Number(e.currentTarget.dataset.id);
    if (e.key === "Enter") commitRename(id);
    if (e.key === "Escape") setEditingId(null);
  }

  function handleRenameBlur(e: React.FocusEvent<HTMLInputElement>) { commitRename(Number(e.currentTarget.dataset.id)); }
  function handleDeleteConfirm() { if (deleteId !== null) { onDelete(deleteId); setDeleteId(null); } }
  function handleDeleteCancel() { setDeleteId(null); }
  function handleAlertOpenChange(open: boolean) { if (!open) setDeleteId(null); }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input type="text" value={search} onChange={handleSearchChange} placeholder="Search conversations…"
            className="h-8 flex-1 bg-transparent text-xs focus-visible:outline-none" />
        </div>
        <button type="button" onClick={onNewChat} aria-label="New chat"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted">
          <PenLine className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">{search ? "No matches" : "No conversations yet"}</p>
          </div>
        ) : (
          DATE_GROUPS.map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{group}</p>
                {items.map((conv) => (
                  <div key={conv.id} className="group relative">
                    {editingId === conv.id ? (
                      <input autoFocus data-id={String(conv.id)} value={editValue}
                        onChange={handleRenameChange} onKeyDown={handleRenameKeyDown} onBlur={handleRenameBlur}
                        className="w-full bg-muted px-3 py-2 text-xs text-foreground focus-visible:outline-none" />
                    ) : (
                      <button type="button" data-id={String(conv.id)} onClick={handleSelectBtn}
                        className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
                          conv.id === activeConversationId && "bg-muted font-medium")}>
                        <span className="flex-1 truncate text-foreground">{conv.title ?? "New conversation"}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground/60">{relativeTime(conv.updatedAt)}</span>
                      </button>
                    )}
                    {editingId !== conv.id && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="Options" className="rounded p-0.5 text-muted-foreground hover:bg-accent">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem data-id={String(conv.id)} onClick={handleMenuRename}>Rename</DropdownMenuItem>
                            <DropdownMenuItem data-id={String(conv.id)} onClick={handleMenuDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}
        {hasNextPage && (
          <div className="flex justify-center py-2">
            <button type="button" onClick={onLoadMore} disabled={isFetchingNextPage}
              className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50">
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the conversation and all its messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
