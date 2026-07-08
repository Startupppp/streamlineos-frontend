"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronUp, Loader2, MessageCircle, MoreHorizontal, PenLine, Search, Trash2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KbConversation } from "@/hooks/api/kb/chat-history";

function conversationDateGroup(updatedAt: string): string {
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
    return (["Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"] as const)
      .filter((g) => map.has(g))
      .map((g) => ({ label: g, items: map.get(g)! }));
  }, [conversations, search]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) { onSearchChange(e.target.value); }
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

  function handleRenameFromMenu(e: React.MouseEvent<HTMLDivElement>) {
    const id = Number(e.currentTarget.dataset.conversationId);
    const title = e.currentTarget.dataset.conversationTitle ?? null;
    if (id) { setRenamingId(id); setRenameValue(title ?? ""); }
  }

  function handleDeleteFromMenu(e: React.MouseEvent<HTMLDivElement>) {
    const id = Number(e.currentTarget.dataset.conversationId);
    if (id) setDeleteTargetId(id);
  }

  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleteTargetId(null); }

  function handleDeleteConfirm() {
    if (deleteTargetId !== null) { onDelete(deleteTargetId); setDeleteTargetId(null); }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-foreground">Conversations</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNewChat} aria-label="New chat">
            <PenLine className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input type="text" value={search} onChange={handleSearchChange} placeholder="Search conversations…" className="h-8 flex-1 bg-transparent text-xs focus-visible:outline-none" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide p-2">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          <>
            {groups.map(({ label, items }) => (
              <div key={label} className="mb-1">
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">{label}</p>
                {items.map((conv) => (
                  <div key={conv.id} className={cn("group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors", activeConversationId === conv.id ? "bg-accent/10" : "hover:bg-muted/50")}>
                    <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {renamingId === conv.id ? (
                      <input type="text" value={renameValue} onChange={handleRenameInputChange} onKeyDown={handleRenameKeyDown} onBlur={handleRenameCommit} autoFocus className="flex-1 min-w-0 bg-transparent text-xs focus-visible:outline-none" />
                    ) : (
                      <button type="button" data-conversation-id={conv.id} onClick={handleSelectItem} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-medium leading-tight text-foreground">{conv.title ?? "New conversation"}</p>
                        <p className="text-[10px] text-muted-foreground">{relativeTime(conv.updatedAt)}</p>
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" aria-label="More options" className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem data-conversation-id={conv.id} data-conversation-title={conv.title ?? ""} onClick={handleRenameFromMenu}>
                          <PenLine className="mr-2 h-3.5 w-3.5" />Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem data-conversation-id={conv.id} onClick={handleDeleteFromMenu} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))}
            {hasNextPage && (
              <button type="button" onClick={onLoadMore} disabled={isFetchingNextPage} className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50">
                {isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><ChevronUp className="h-3.5 w-3.5" />Load more</>}
              </button>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this conversation and all its messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
