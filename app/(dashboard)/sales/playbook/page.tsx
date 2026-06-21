"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Copy, Check, Pencil, Trash2, ArrowUp, ArrowDown, BookOpen } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  usePlaybookEntries,
  useCreatePlaybookEntry,
  useUpdatePlaybookEntry,
  useDeletePlaybookEntry,
  type PlaybookEntry,
} from "@/lib/api/hooks/sales-playbook";
import { useAbility } from "@/lib/abilities-context";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const UNCATEGORIZED = "Uncategorized";

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [content]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      aria-label="Copy content"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function PlaybookEntrySheet({
  entry,
  onClose,
}: {
  entry?: PlaybookEntry;
  onClose: () => void;
}) {
  const isEdit = !!entry;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState(entry?.category ?? "");
  const [content, setContent] = useState(entry?.content ?? "");

  const create = useCreatePlaybookEntry();
  const update = useUpdatePlaybookEntry();
  const isPending = create.isPending || update.isPending;

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required");
      return;
    }
    const payload = {
      title: trimmedTitle,
      category: category.trim() || undefined,
      content: content.trim(),
    };
    if (isEdit) {
      update.mutate(
        { id: entry.id, ...payload, category: category.trim() || null },
        {
          onSuccess: () => { toast.success("Playbook entry updated"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Playbook entry created"); onClose(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [title, category, content, isEdit, entry, create, update, onClose]);

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Entry" : "New Playbook Entry"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pb-title">Title *</Label>
            <Input
              id="pb-title"
              placeholder="e.g. Cold Call Opening"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pb-category">Category</Label>
            <Input
              id="pb-category"
              placeholder="e.g. Scripts, Objections, Closing"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pb-content">Content</Label>
            <Textarea
              id="pb-content"
              rows={8}
              placeholder="Script, objection handler, or best practice…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Entry"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PlaybookCard({
  entry,
  canManage,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  reordering,
}: {
  entry: PlaybookEntry;
  canManage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  reordering: boolean;
}) {
  return (
    <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug min-w-0 flex-1 break-words">{entry.title}</h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <CopyButton content={entry.content} />
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onMoveUp}
                  disabled={!canMoveUp || reordering}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onMoveDown}
                  disabled={!canMoveDown || reordering}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                  aria-label="Edit entry"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={onDelete}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-4">
        {entry.content.trim() ? (
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{entry.content}</p>
        ) : (
          <p className="text-xs text-muted-foreground/60 italic">No content yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SalesPlaybookPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlaybookEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookEntry | null>(null);

  const ability = useAbility();
  const canManage = ability.can("manage", "sales");

  const { data, isLoading, isError, refetch } = usePlaybookEntries();
  const updateEntry = useUpdatePlaybookEntry();
  const deleteEntry = useDeletePlaybookEntry();

  const entries = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        (e.category ?? "").toLowerCase().includes(q),
    );
  }, [entries, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlaybookEntry[]>();
    for (const entry of filtered) {
      const key = entry.category?.trim() || UNCATEGORIZED;
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleReorder = useCallback(
    (entry: PlaybookEntry, neighbor: PlaybookEntry) => {
      updateEntry.mutate(
        { id: entry.id, sortOrder: neighbor.sortOrder },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
      updateEntry.mutate(
        { id: neighbor.id, sortOrder: entry.sortOrder },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
    },
    [updateEntry],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteEntry.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Playbook entry deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteEntry]);

  return (
    <PageWrapper
      title="Sales Playbook"
      subtitle="Scripts, objection handlers, and best practices for your sales team"
      actions={
        canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Entry
          </Button>
        ) : undefined
      }
      filters={
        <div className="relative max-w-sm w-full">
          <Input
            placeholder="Search by title, content, or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      }
    >
      {isLoading ? (
        <LoadingState variant="cards" rows={6} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load playbook"
          description="An error occurred while loading playbook entries. Please try again."
          onRetry={() => refetch()}
        />
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <EmptyState
            icon={BookOpen}
            title="No playbook entries yet"
            description="Build a shared library of scripts, objection handlers, and best practices for your team."
            action={canManage ? { label: "Add your first playbook entry", onClick: () => setCreateOpen(true) } : undefined}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[40vh]">
          <EmptyState
            icon={BookOpen}
            title="No matching entries"
            description="Try a different search term."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, categoryEntries]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{category}</h2>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {categoryEntries.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryEntries.map((entry, index) => (
                  <PlaybookCard
                    key={entry.id}
                    entry={entry}
                    canManage={canManage}
                    canMoveUp={index > 0}
                    canMoveDown={index < categoryEntries.length - 1}
                    reordering={updateEntry.isPending}
                    onEdit={() => setEditTarget(entry)}
                    onDelete={() => setDeleteTarget(entry)}
                    onMoveUp={() => handleReorder(entry, categoryEntries[index - 1])}
                    onMoveDown={() => handleReorder(entry, categoryEntries[index + 1])}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <PlaybookEntrySheet onClose={() => setCreateOpen(false)} />}
      {editTarget && <PlaybookEntrySheet entry={editTarget} onClose={() => setEditTarget(null)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
            >
              {deleteEntry.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
