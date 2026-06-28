"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Copy, Check, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
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
import { EmptyPublicDocsIllustration } from "@/components/illustrations";
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

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value), []);
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value), []);

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
              onChange={handleTitleChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pb-category">Category</Label>
            <Input
              id="pb-category"
              placeholder="e.g. Scripts, Objections, Closing"
              value={category}
              onChange={handleCategoryChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pb-content">Content</Label>
            <Textarea
              id="pb-content"
              rows={8}
              placeholder="Script, objection handler, or best practice…"
              value={content}
              onChange={handleContentChange}
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
  neighborUp,
  neighborDown,
  onEdit,
  onDelete,
  onReorder,
  reordering,
}: {
  entry: PlaybookEntry;
  canManage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  neighborUp: PlaybookEntry | undefined;
  neighborDown: PlaybookEntry | undefined;
  onEdit: (e: PlaybookEntry) => void;
  onDelete: (e: PlaybookEntry) => void;
  onReorder: (entry: PlaybookEntry, neighbor: PlaybookEntry) => void;
  reordering: boolean;
}) {
  const handleEdit = useCallback(() => onEdit(entry), [onEdit, entry]);
  const handleDelete = useCallback(() => onDelete(entry), [onDelete, entry]);
  const handleMoveUp = useCallback(() => {
    if (neighborUp) onReorder(entry, neighborUp);
  }, [onReorder, entry, neighborUp]);
  const handleMoveDown = useCallback(() => {
    if (neighborDown) onReorder(entry, neighborDown);
  }, [onReorder, entry, neighborDown]);

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
                  onClick={handleMoveUp}
                  disabled={!canMoveUp || reordering}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleMoveDown}
                  disabled={!canMoveDown || reordering}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleEdit}
                  aria-label="Edit entry"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={handleDelete}
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

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleDeleteDialogChange = useCallback((open: boolean) => { if (!open) setDeleteTarget(null); }, []);
  const handleEditEntry = useCallback((e: PlaybookEntry) => setEditTarget(e), []);
  const handleDeleteEntry = useCallback((e: PlaybookEntry) => setDeleteTarget(e), []);

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
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Entry
          </Button>
        ) : undefined
      }
      filters={
        <div className="relative max-w-sm w-full">
          <Input
            placeholder="Search by title, content, or category…"
            value={search}
            onChange={handleSearchChange}
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
          onRetry={handleRetry}
        />
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <EmptyState
            illustration={<EmptyPublicDocsIllustration />}
            title="No playbook entries yet"
            description="Build a shared library of scripts, objection handlers, and best practices for your team."
            action={canManage ? { label: "Add your first playbook entry", onClick: handleOpenCreate } : undefined}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[40vh]">
          <EmptyState
            illustration={<EmptyPublicDocsIllustration />}
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
                    neighborUp={index > 0 ? categoryEntries[index - 1] : undefined}
                    neighborDown={index < categoryEntries.length - 1 ? categoryEntries[index + 1] : undefined}
                    reordering={updateEntry.isPending}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                    onReorder={handleReorder}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <PlaybookEntrySheet onClose={handleCloseCreate} />}
      {editTarget && <PlaybookEntrySheet entry={editTarget} onClose={handleCloseEdit} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
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
